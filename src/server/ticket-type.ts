import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { surinameLocalToDate } from '#/lib/datetime.ts'
import { ticketTypeSchema } from '#/lib/validation/ticket-type.ts'
import { reservedByTicketType } from '#/server/reservations.server.ts'

/**
 * Server functions voor tickettypes (BR-300..BR-304). Owner-geguard via
 * `requireOwnedEvent`: een organisator beheert uitsluitend de tickettypes van
 * zijn eigen evenementen.
 */

function toRecord(data: {
  name: string
  description?: string
  priceCents: number
  quantity: number
  minimumPerOrder: number
  maximumPerOrder: number
  salesStart?: string
  salesEnd?: string
  visible: boolean
}) {
  return {
    name: data.name,
    description: data.description ?? null,
    priceCents: data.priceCents,
    quantity: data.quantity,
    minimumPerOrder: data.minimumPerOrder,
    maximumPerOrder: data.maximumPerOrder,
    salesStart: surinameLocalToDate(data.salesStart),
    salesEnd: surinameLocalToDate(data.salesEnd),
    visible: data.visible,
  }
}

export const createTicketType = createServerFn({ method: 'POST' })
  .validator(ticketTypeSchema.and(z.object({ eventId: z.uuid() })))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const last = await db.ticketType.findFirst({
      where: { eventId: data.eventId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    return db.ticketType.create({
      data: {
        eventId: data.eventId,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ...toRecord(data),
      },
    })
  })

export const updateTicketType = createServerFn({ method: 'POST' })
  .validator(
    ticketTypeSchema.and(
      z.object({ eventId: z.uuid(), ticketTypeId: z.uuid() }),
    ),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    // BR-304: de capaciteit mag niet onder wat al verkocht/gereserveerd is
    // zakken — anders verdwijnt het overschot stilzwijgend (availableQuantity
    // klemt op 0) zonder dat iemand het ziet.
    const reserved = await reservedByTicketType([data.ticketTypeId])
    const reservedCount = reserved[data.ticketTypeId] ?? 0
    if (data.quantity < reservedCount) {
      throw new Error(
        `Er zijn al ${reservedCount} tickets verkocht of gereserveerd — de capaciteit kan niet lager dan dat.`,
      )
    }

    return db.ticketType.update({
      where: { id: data.ticketTypeId, eventId: data.eventId },
      data: toRecord(data),
    })
  })

export const setTicketTypeVisibility = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      eventId: z.uuid(),
      ticketTypeId: z.uuid(),
      visible: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.ticketType.update({
      where: { id: data.ticketTypeId, eventId: data.eventId },
      data: { visible: data.visible },
    })
  })

/** Verwijderen mag zolang er niets verkocht is (BR-304 — nog geen orders). */
export const deleteTicketType = createServerFn({ method: 'POST' })
  .validator(z.object({ eventId: z.uuid(), ticketTypeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const reserved = await reservedByTicketType([data.ticketTypeId])
    if ((reserved[data.ticketTypeId] ?? 0) > 0) {
      throw new Error(
        'Dit tickettype heeft al verkochte of gereserveerde tickets en kan niet verwijderd worden.',
      )
    }

    await db.ticketType.update({
      where: { id: data.ticketTypeId, eventId: data.eventId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  })

export const reorderTicketType = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      eventId: z.uuid(),
      ticketTypeId: z.uuid(),
      direction: z.enum(['up', 'down']),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const item = await db.ticketType.findFirst({
      where: { id: data.ticketTypeId, eventId: data.eventId, deletedAt: null },
    })
    if (!item) throw new Error('TICKET_TYPE_NOT_FOUND')

    const neighbour = await db.ticketType.findFirst({
      where: {
        eventId: data.eventId,
        deletedAt: null,
        sortOrder:
          data.direction === 'up'
            ? { lt: item.sortOrder }
            : { gt: item.sortOrder },
      },
      orderBy: { sortOrder: data.direction === 'up' ? 'desc' : 'asc' },
    })
    if (!neighbour) return { success: true }

    await db.$transaction([
      db.ticketType.update({
        where: { id: item.id },
        data: { sortOrder: neighbour.sortOrder },
      }),
      db.ticketType.update({
        where: { id: neighbour.id },
        data: { sortOrder: item.sortOrder },
      }),
    ])
    return { success: true }
  })
