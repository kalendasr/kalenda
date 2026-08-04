import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import type { CheckInResult } from '#/generated/prisma/client.ts'

/**
 * Rapportages voor één event (Fase 8): omzet, check-ins, capaciteit en
 * ticketverkoop per tickettype. Owner-geguard, uitsluitend gerealiseerde
 * verkoop (Paid/Completed) telt mee als omzet/verkoop.
 */

const CHECK_IN_RESULTS: ReadonlyArray<CheckInResult> = [
  'Valid',
  'AlreadyCheckedIn',
  'Invalid',
  'NotFound',
]

export const getEventReport = createServerFn({ method: 'GET' })
  .validator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const [revenue, checkInGroups, ticketTypes] = await Promise.all([
      db.order.aggregate({
        where: {
          eventId: data.eventId,
          deletedAt: null,
          orderStatus: { in: ['Paid', 'Completed'] },
        },
        _sum: { totalCents: true },
      }),
      db.checkIn.groupBy({
        by: ['result'],
        where: { eventId: data.eventId },
        _count: { _all: true },
      }),
      db.ticketType.findMany({
        where: { eventId: data.eventId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          quantity: true,
          orderItems: {
            where: {
              order: {
                deletedAt: null,
                orderStatus: { in: ['Paid', 'Completed'] },
              },
            },
            select: { quantity: true },
          },
        },
      }),
    ])

    const checkIns = Object.fromEntries(
      CHECK_IN_RESULTS.map((result) => [
        result,
        checkInGroups.find((group) => group.result === result)?._count._all ??
          0,
      ]),
    ) as Record<CheckInResult, number>

    return {
      revenueCents: revenue._sum.totalCents ?? 0,
      checkIns,
      ticketTypes: ticketTypes.map((type) => ({
        id: type.id,
        name: type.name,
        capacity: type.quantity,
        sold: type.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      })),
    }
  })
