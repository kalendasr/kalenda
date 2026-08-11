import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import { listTicketsInputSchema } from '#/lib/validation/admin.ts'
import type { ListTicketsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'
import type { TicketStatus } from '#/generated/prisma/enums.ts'

/**
 * Ticketoverzicht voor de platformbeheerder (Fase 12) — lezend.
 *
 * Een beheerder kan tickets opzoeken en hun toestand inzien, maar niet
 * annuleren, opnieuw uitgeven of inchecken. Die overgangen horen bij de
 * organisator en de scanner, waar de bijbehorende regels gelden (BR-604,
 * BR-701, BR-801/802). Een beheerdersknop die een ticket buiten die regels om
 * verzet, zou dubbel inchecken of ongedekte uitgifte mogelijk maken.
 */

function buildTicketWhere(input: ListTicketsInput): Prisma.TicketWhereInput {
  const orderWhere: Prisma.OrderWhereInput = { deletedAt: null }
  if (input.eventId) orderWhere.eventId = input.eventId
  if (input.organizationId) {
    orderWhere.event = { organizationId: input.organizationId }
  }

  const orderItemWhere: Prisma.OrderItemWhereInput = { order: orderWhere }
  if (input.ticketTypeId) orderItemWhere.ticketTypeId = input.ticketTypeId

  const where: Prisma.TicketWhereInput = { orderItem: orderItemWhere }

  if (input.status !== 'all') where.status = input.status

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    // Ticketnummer en ordernummer zijn unieke identifiers: exact opzoeken via
    // hun eigen index. Alleen op namen en e-mail zoeken we onscherp.
    where.OR = [
      { ticketNumber: search },
      { orderItem: { order: { orderNumber: search.toUpperCase() } } },
      {
        orderItem: {
          order: { customer: { email: containsInsensitive(search) } },
        },
      },
      {
        orderItem: {
          order: { customer: { lastName: containsInsensitive(search) } },
        },
      },
    ]
  }

  return where
}

export const listTickets = createServerFn({ method: 'GET' })
  .validator(listTicketsInputSchema)
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    const where = buildTicketWhere(data)
    const orderBy = {
      [data.sort]: data.direction,
    } as Prisma.TicketOrderByWithRelationInput

    return paginateQuery(data, {
      findMany: ({ skip, take }) =>
        db.ticket.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            issuedAt: true,
            sentAt: true,
            sentVia: true,
            checkedInAt: true,
            cancelledAt: true,
            checkedBy: { select: { id: true, name: true } },
            orderItem: {
              select: {
                ticketType: { select: { id: true, name: true } },
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                    orderStatus: true,
                    paymentStatus: true,
                    createdAt: true,
                    customer: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                    event: {
                      select: {
                        id: true,
                        title: true,
                        organization: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      count: () => db.ticket.count({ where }),
    })
  })

/** Verdeling over ticketstatussen, voor de statistiekbalk boven de lijst. */
export const getTicketStatusSummary = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    const groups = await db.ticket.groupBy({
      by: ['status'],
      where: { orderItem: { order: { deletedAt: null } } },
      _count: { _all: true },
    })

    const summary: Partial<Record<TicketStatus, number>> = {}
    for (const group of groups) summary[group.status] = group._count._all
    return summary
  },
)
