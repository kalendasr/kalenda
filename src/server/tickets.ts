import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { waLink } from '#/lib/whatsapp.ts'
import { buildTicketShareMessage } from '#/lib/ticket-share-message.ts'
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
 * Registreert dat de tickets via WhatsApp zijn (of gaan worden) geleverd:
 * markeert de tickets als `Sent` met kanaal `WhatsApp` en promoot de order
 * naar `Completed` zodra ze eerder alleen `Paid` was. Gedeeld door
 * `shareTicketsViaWhatsApp` (organisator klikt op "Delen") en de
 * bevestigingspopup (organisator klikt op de `wa.me`-link zelf).
 */
async function registerWhatsAppDelivery(orderId: string): Promise<void> {
  const now = new Date()
  // Zelfde transactiepatroon als de e-mailvariant (tickets.server.ts): beide
  // updates horen atomisch te zijn, anders kan een order bij een fout ertussen
  // op `Paid` blijven staan terwijl de tickets al op `Sent` staan.
  await db.$transaction(async (tx) => {
    const result = await tx.ticket.updateMany({
      where: { orderItem: { orderId } },
      data: { status: 'Sent', sentAt: now, sentVia: 'WhatsApp' },
    })
    if (result.count === 0) {
      throw new Error('Voor deze bestelling zijn geen tickets beschikbaar.')
    }
    await tx.order.updateMany({
      where: { id: orderId, orderStatus: 'Paid' },
      data: { orderStatus: 'Completed' },
    })
  })
}

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

    const orderUrl = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
    const message = buildTicketShareMessage({
      customerFirstName: order.customer.firstName,
      eventTitle: order.event.title,
      orderUrl,
    })

    await registerWhatsAppDelivery(order.id)

    return { whatsappUrl: waLink(order.customer.phone, message) }
  })

/**
 * Registreert dat de organisator zojuist zelf de `wa.me`-link met de
 * ticketlink heeft geopend (bevestigingspopup na `approvePayment`). Zelfde
 * registratie als `shareTicketsViaWhatsApp`, maar zonder nieuwe link te
 * bouwen — die heeft de organisator al via het bevestigingsresultaat.
 */
export const markTicketsSharedViaWhatsApp = createServerFn({ method: 'POST' })
  .validator(orderIdSchema)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser()

    const order = await db.order.findUnique({ where: { id: data.orderId } })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)
    assertHasTickets(order.orderStatus)

    await registerWhatsAppDelivery(order.id)

    return { ok: true }
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
