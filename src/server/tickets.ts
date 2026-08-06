import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { waLink } from '#/lib/whatsapp.ts'
import { ticketQrPayload } from '#/lib/ticket-qr.ts'
import { sendTicketEmailForOrder } from '#/server/tickets.server.ts'

/**
 * Tickets voor de organisator (Fase 6 + Fase 9).
 *
 * Het uitgeven van tickets gebeurt in `approvePayment` (betaling bevestigd,
 * BR-604). Deze module bevat het (opnieuw) versturen van tickets (BR-704) —
 * per e-mail of door de link te delen via WhatsApp — en de publieke opzoeking
 * die de ticketpagina (`/ticket/$ticketNumber`) en de QR-code voeden.
 */

const orderIdSchema = z.object({ orderId: z.uuid() })

function assertHasTickets(orderStatus: string): void {
  if (orderStatus !== 'Paid' && orderStatus !== 'Completed') {
    throw new Error('Deze bestelling heeft nog geen tickets om te versturen.')
  }
}

/** Verstuurt de ticketmail opnieuw voor een betaalde order (BR-704). */
export const resendOrderTickets = createServerFn({ method: 'POST' })
  .validator(orderIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({ where: { id: data.orderId } })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)
    assertHasTickets(order.orderStatus)

    return sendTicketEmailForOrder(order.id, 'Email')
  })

/**
 * Deelt de tickets via WhatsApp (Fase 9). Het platform verstuurt zelf niets —
 * er is geen WhatsApp Business API (BR-600) — het opent het gesprek met de
 * klant met een link naar de tickets, en registreert dat als leveringskanaal.
 */
export const shareTicketsViaWhatsApp = createServerFn({ method: 'POST' })
  .validator(orderIdSchema)
  .handler(async ({ data }): Promise<{ whatsappUrl: string | null }> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        customer: { select: { firstName: true, phone: true } },
        event: { select: { title: true } },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)
    assertHasTickets(order.orderStatus)

    const now = new Date()
    const orderUrl = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
    const message = [
      `Hoi ${order.customer.firstName}, hier zijn je tickets voor ${order.event.title}:`,
      orderUrl,
    ].join('\n')

    const result = await db.ticket.updateMany({
      where: { orderItem: { orderId: order.id } },
      data: { status: 'Sent', sentAt: now, sentVia: 'WhatsApp' },
    })
    if (result.count === 0) {
      throw new Error('Voor deze bestelling zijn geen tickets beschikbaar.')
    }
    await db.order.updateMany({
      where: { id: order.id, orderStatus: 'Paid' },
      data: { orderStatus: 'Completed' },
    })

    return { whatsappUrl: waLink(order.customer.phone, message) }
  })

/**
 * Publieke opzoeking op ticketnummer (BR-700/701) — de QR-code wijst hier
 * rechtstreeks naartoe, dus geen login nodig. Voedt `/ticket/$ticketNumber`.
 */
export const getTicketByNumber = createServerFn({ method: 'GET' })
  .validator(z.object({ ticketNumber: z.string().min(1) }))
  .handler(async ({ data }) => {
    const ticket = await db.ticket.findUnique({
      where: { ticketNumber: data.ticketNumber },
      include: {
        orderItem: {
          include: {
            ticketType: { select: { name: true } },
            order: {
              include: {
                customer: { select: { firstName: true, lastName: true } },
                event: {
                  select: {
                    title: true,
                    startsAt: true,
                    venue: { select: { name: true, district: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!ticket) return null

    const { order } = ticket.orderItem
    return {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      customerName:
        `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      ticketTypeName: ticket.orderItem.ticketType.name,
      eventTitle: order.event.title,
      startsAt: order.event.startsAt,
      venueName: order.event.venue?.name ?? null,
      venueDistrict: order.event.venue?.district ?? null,
      baseUrl: getServerEnv().BETTER_AUTH_URL,
      qrPayload: ticketQrPayload(
        ticket.ticketNumber,
        getServerEnv().BETTER_AUTH_URL,
      ),
    }
  })
