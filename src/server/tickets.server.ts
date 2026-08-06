import { db } from '#/lib/db.server.ts'
import type { TicketDeliveryChannel } from '#/generated/prisma/client.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { sendTicketEmail } from '#/lib/ticket-email.ts'

/**
 * Server-only ticket-helpers (Fase 6 + Fase 9). Staan in een `.server.ts`-
 * module zodat ze nooit in een client-bundle terechtkomen (import-protection):
 * ze raken de database en sturen e-mail.
 */

export type SendTicketEmailResult = {
  sentAt: Date
  to: string
  count: number
}

/**
 * Verstuurt (opnieuw) de ticketmail voor een order en markeert alle tickets als
 * `Sent` (BR-702/704), met het kanaal waarlangs geleverd is. Zet de order pas
 * hier op `Completed` — "Afgerond" betekent voortaan écht "tickets geleverd",
 * niet alleen "betaald" (zie payments.ts `approvePayment`).
 *
 * Best-effort: een mailfout wordt doorgegeven zodat de aanroeper kan
 * beslissen, maar de tickets zelf staan al vast en de order blijft `Paid`
 * totdat een verzending lukt.
 */
export async function sendTicketEmailForOrder(
  orderId: string,
  channel: TicketDeliveryChannel = 'Email',
): Promise<SendTicketEmailResult> {
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

  // QR blijft gelijk; we markeren alleen dat de ticket (opnieuw) verstuurd is,
  // en via welk kanaal.
  const now = new Date()
  await db.$transaction([
    db.ticket.updateMany({
      where: { orderItem: { orderId: order.id } },
      data: { status: 'Sent', sentAt: now, sentVia: channel },
    }),
    // Pas nu telt de order als afgerond (BR-505): betaald én geleverd. Alleen
    // van toepassing op de eerste (succesvolle) verzending na goedkeuring —
    // een latere herverzending (BR-704) laat een al-Completed order ongemoeid.
    db.order.updateMany({
      where: { id: order.id, orderStatus: 'Paid' },
      data: { orderStatus: 'Completed' },
    }),
  ])

  return { sentAt: now, to: order.customer.email, count: tickets.length }
}
