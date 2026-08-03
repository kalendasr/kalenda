import { db } from '#/lib/db.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { sendTicketEmail } from '#/lib/ticket-email.ts'

/**
 * Server-only ticket-helpers (Fase 6). Staan in een `.server.ts`-module zodat
 * ze nooit in een client-bundle terechtkomen (import-protection): ze raken de
 * database en sturen e-mail.
 */

/**
 * Verstuurt (opnieuw) de ticketmail voor een order en markeert alle tickets als
 * `Sent` (BR-702/704). Best-effort: een mailfout wordt doorgegeven zodat de
 * aanroeper kan beslissen, maar de tickets zelf staan al vast.
 */
export async function sendTicketEmailForOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          ticketType: { select: { name: true } },
          tickets: { select: { ticketNumber: true, status: true } },
        },
      },
      event: {
        select: {
          title: true,
          startsAt: true,
          venue: { select: { name: true } },
        },
      },
    },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')

  // Verzamel alle tickets (één per stoel, over alle regels).
  const tickets = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      ticketTypeName: item.ticketType.name,
    })),
  )
  if (tickets.length === 0) {
    throw new Error('Voor deze bestelling zijn geen tickets beschikbaar.')
  }

  const url = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
  await sendTicketEmail({
    to: order.customer.email,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    orderNumber: order.orderNumber,
    eventTitle: order.event.title,
    startsAt: order.event.startsAt,
    venueName: order.event.venue?.name ?? null,
    totalCents: order.totalCents,
    baseUrl: getServerEnv().BETTER_AUTH_URL,
    orderUrl: url,
    tickets,
  })

  // QR blijft gelijk; we markeren alleen dat de ticket (opnieuw) verstuurd is.
  const now = new Date()
  await db.ticket.updateMany({
    where: { orderItem: { orderId: order.id } },
    data: { status: 'Sent', sentAt: now },
  })
}
