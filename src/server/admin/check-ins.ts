import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import { listCheckInsInputSchema } from '#/lib/validation/admin.ts'
import type { ListCheckInsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Check-inoverzicht voor de platformbeheerder (Fase 12).
 *
 * `CheckIn` is een append-only scanlog: élke scan staat erin, ook mislukte
 * (`Invalid`, `NotFound`) en dubbele (`AlreadyCheckedIn`). Dat maakt hem
 * geschikt als bewijsvoering, maar ongeschikt om "aantal ingecheckt" mee te
 * tellen — dan zou een tweede scan dubbel meetellen. Het aantal ingecheckte
 * bezoekers komt daarom uit `Ticket.status = CheckedIn` (BR-801).
 */

function buildCheckInWhere(input: ListCheckInsInput): Prisma.CheckInWhereInput {
  const where: Prisma.CheckInWhereInput = {}

  if (input.result !== 'all') where.result = input.result
  if (input.eventId) where.eventId = input.eventId

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { ticketNumber: search },
      { event: { title: containsInsensitive(search) } },
      { scannedBy: { name: containsInsensitive(search) } },
    ]
  }

  return where
}

export const listCheckIns = createServerFn({ method: 'GET' })
  .validator(listCheckInsInputSchema)
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    const where = buildCheckInWhere(data)

    return paginateQuery(data, {
      findMany: ({ skip, take }) =>
        db.checkIn.findMany({
          where,
          orderBy: { scannedAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            ticketNumber: true,
            result: true,
            scannedAt: true,
            event: {
              select: {
                id: true,
                title: true,
                organization: { select: { id: true, name: true } },
              },
            },
            scannedBy: { select: { id: true, name: true } },
            ticket: {
              select: {
                id: true,
                status: true,
                orderItem: {
                  select: {
                    ticketType: { select: { name: true } },
                    order: {
                      select: {
                        orderNumber: true,
                        customer: {
                          select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      count: () => db.checkIn.count({ where }),
    })
  })

/**
 * Check-instatistieken, platformbreed of voor één evenement.
 *
 * "Verkocht" telt alle tickets die daadwerkelijk in omloop zijn
 * (`Issued`/`Sent`/`CheckedIn`); geannuleerde tickets tellen niet mee, anders
 * zou het check-inpercentage kunstmatig dalen.
 */
export const getCheckInStats = createServerFn({ method: 'GET' })
  .validator(z.object({ eventId: z.uuid().optional() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    const orderWhere: Prisma.OrderWhereInput = { deletedAt: null }
    if (data.eventId) orderWhere.eventId = data.eventId

    const [issued, checkedIn, scanGroups] = await Promise.all([
      db.ticket.count({
        where: {
          status: { in: ['Issued', 'Sent', 'CheckedIn'] },
          orderItem: { order: orderWhere },
        },
      }),
      db.ticket.count({
        where: { status: 'CheckedIn', orderItem: { order: orderWhere } },
      }),
      db.checkIn.groupBy({
        by: ['result'],
        where: data.eventId ? { eventId: data.eventId } : {},
        _count: { _all: true },
      }),
    ])

    const scans = Object.fromEntries(
      scanGroups.map((group) => [group.result, group._count._all]),
    ) as Partial<Record<string, number>>

    return {
      ticketsIssued: issued,
      ticketsCheckedIn: checkedIn,
      ticketsNotCheckedIn: Math.max(0, issued - checkedIn),
      checkInRate: issued === 0 ? 0 : checkedIn / issued,
      scans,
      totalScans: scanGroups.reduce((sum, g) => sum + g._count._all, 0),
    }
  })
