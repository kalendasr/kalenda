import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { sendTicketEmailForOrder } from '#/server/tickets.server.ts'

/**
 * Tickets voor de organisator (Fase 6).
 *
 * Het uitgeven van tickets gebeurt in `approvePayment` (betaling bevestigd,
 * BR-604). Deze module bevat het opnieuw versturen van de ticketmail (BR-704);
 * de gedeelde helper die e-mail + PDF bouwt en tickets als `Sent` markeert staat
 * in `tickets.server.ts`.
 */

const resendOrderTicketsSchema = z.object({ orderId: z.uuid() })

/** Verstuurt de ticketmail opnieuw voor een betaalde order (BR-704). */
export const resendOrderTickets = createServerFn({ method: 'POST' })
  .validator(resendOrderTicketsSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({ where: { id: data.orderId } })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    // Alleen her-verzenden als er daadwerkelijk tickets zijn (betaald/afgerond).
    if (order.orderStatus !== 'Paid' && order.orderStatus !== 'Completed') {
      throw new Error('Deze bestelling heeft nog geen tickets om te versturen.')
    }

    await sendTicketEmailForOrder(order.id)
    return { ok: true }
  })
