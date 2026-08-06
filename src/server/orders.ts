import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'

/**
 * Orders voor de organisator (owner-geguard). Fase 4: read-only overzicht van
 * binnenkomende bestellingen per event. Het bevestigen/afkeuren van betalingen
 * komt in Fase 5.
 */
export const listEventOrders = createServerFn({ method: 'GET' })
  .validator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.order.findMany({
      where: { eventId: data.eventId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        items: {
          select: {
            quantity: true,
            ticketType: { select: { name: true } },
            tickets: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
                sentAt: true,
                sentVia: true,
                checkedInAt: true,
              },
            },
          },
        },
        payment: {
          select: {
            state: true,
            proofKey: true,
            requestedAt: true,
            verifiedAt: true,
            reference: true,
            notes: true,
          },
        },
      },
    })
  })
