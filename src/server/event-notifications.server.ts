import { db } from '#/lib/db.server.ts'
import { notify } from '#/server/notifications.server.ts'
import type { EventChange } from '#/lib/notifications/definitions/event-changed.ts'

/**
 * BR-904: een materiële wijziging (tijd/locatie) aan een gepubliceerd event
 * informeert elke klant met een actieve bestelling. "Actief" = niet
 * geannuleerd/verlopen — ook wie nog moet betalen heeft een reservering voor
 * dit event en wil van de wijziging weten.
 *
 * Staat in een `.server.ts`-bestand omdat het de database raakt: `event.ts`
 * wordt door routes geïmporteerd, en een gewone geëxporteerde functie die
 * `db` aanspreekt overleeft het strippen van de server-function-handlers en
 * belandt dan in de clientbundel.
 */
export async function notifyEventChanged(
  eventId: string,
  eventTitle: string,
  change: EventChange,
) {
  const orders = await db.order.findMany({
    where: {
      eventId,
      deletedAt: null,
      orderStatus: { notIn: ['Cancelled', 'Expired'] },
    },
    select: { orderNumber: true, customerId: true },
  })

  await Promise.all(
    orders.map((order) =>
      notify(
        'event.changed',
        { kind: 'customer', customerId: order.customerId },
        { orderNumber: order.orderNumber, eventTitle, change },
      ),
    ),
  )
}
