import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { REALISED_ORDER_STATUSES } from '#/lib/order-status.ts'
import {
  assertLifecycle,
  canDeleteEvent,
  canUnpublishEvent,
} from '#/lib/event-lifecycle.ts'
import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import type { ListEventsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Evenementbeheer voor de platformbeheerder (Fase 12).
 *
 * De beheerder slaat de eigenaarschapscontrole over — dat ís zijn rol — maar
 * nooit de businessregels. Publiceren gebruikt dezelfde
 * `eventPublishReadiness`, depubliceren en verwijderen dezelfde
 * `event-lifecycle`-controles als de organisator. Zo kan een beheerder geen
 * toestand afdwingen die de applicatie zelf onmogelijk acht.
 */

function buildEventWhere(input: ListEventsInput): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = { deletedAt: null }

  if (input.status !== 'all') where.status = input.status
  if (input.organizationId) where.organizationId = input.organizationId

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { title: containsInsensitive(search) },
      { slug: containsInsensitive(search) },
      { organization: { name: containsInsensitive(search) } },
    ]
  }

  return where
}

export async function listEventsHandler(data: ListEventsInput) {
  await requirePlatformAdmin()

  const where = buildEventWhere(data)
  const orderBy = {
    [data.sort]: data.direction,
  } as Prisma.EventOrderByWithRelationInput

  return paginateQuery(data, {
    findMany: ({ skip, take }) =>
      db.event.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          _count: { select: { orders: true, ticketTypes: true } },
        },
      }),
    count: () => db.event.count({ where }),
  })
}

export async function getEventDetailHandler(data: { eventId: string }) {
  await requirePlatformAdmin()

  const event = await db.event.findUnique({
    where: { id: data.eventId },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      createdAt: true,
      deletedAt: true,
      organization: {
        select: { id: true, name: true, deletedAt: true, isVerified: true },
      },
      category: { select: { id: true, name: true } },
      venue: { select: { name: true, address: true, district: true } },
      ticketTypes: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          priceCents: true,
          quantity: true,
          visible: true,
          salesStart: true,
          salesEnd: true,
        },
      },
    },
  })

  if (!event) throw new Error('EVENT_NOT_FOUND')

  const [sales, soldPerType, ticketCount, orderCount, checkIns] =
    await Promise.all([
      db.order.aggregate({
        where: {
          eventId: event.id,
          deletedAt: null,
          orderStatus: { in: [...REALISED_ORDER_STATUSES] },
        },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      db.orderItem.groupBy({
        by: ['ticketTypeId'],
        where: {
          order: {
            eventId: event.id,
            deletedAt: null,
            orderStatus: { in: [...REALISED_ORDER_STATUSES] },
          },
        },
        _sum: { quantity: true },
      }),
      db.ticket.count({
        where: {
          status: { in: ['Issued', 'Sent', 'CheckedIn'] },
          orderItem: { order: { eventId: event.id, deletedAt: null } },
        },
      }),
      db.order.count({ where: { eventId: event.id, deletedAt: null } }),
      db.ticket.count({
        where: {
          status: 'CheckedIn',
          orderItem: { order: { eventId: event.id, deletedAt: null } },
        },
      }),
    ])

  const soldByTicketType = new Map(
    soldPerType.map((row) => [row.ticketTypeId, row._sum.quantity ?? 0]),
  )

  return {
    event: {
      ...event,
      ticketTypes: event.ticketTypes.map((type) => ({
        ...type,
        sold: soldByTicketType.get(type.id) ?? 0,
      })),
    },
    realisedRevenueCents: sales._sum.totalCents ?? 0,
    realisedOrderCount: sales._count._all,
    orderCount,
    ticketsIssued: ticketCount,
    ticketsCheckedIn: checkIns,
  }
}

export async function publishEventAdminHandler(data: { eventId: string }) {
  const admin = await requirePlatformAdmin()

  const event = await db.event.findFirst({
    where: { id: data.eventId, deletedAt: null },
    include: {
      _count: { select: { ticketTypes: { where: { deletedAt: null } } } },
      organization: { select: { paymentSettings: true } },
    },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')

  const readiness = eventPublishReadiness(
    {
      title: event.title,
      shortDescription: event.shortDescription,
      description: event.description,
      startsAt: event.startsAt,
      categoryId: event.categoryId,
      venueId: event.venueId,
      coverImage: event.coverImage,
      ticketTypeCount: event._count.ticketTypes,
    },
    event.organization.paymentSettings,
  )
  if (!readiness.ready) {
    throw new Error(
      `Evenement is nog niet compleet: ${readiness.missing.map((item) => item.label).join(', ')}.`,
    )
  }

  await db.event.update({
    where: { id: event.id },
    data: { status: 'Published' },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: 'EventPublished',
    targetType: 'Event',
    targetId: event.id,
    targetLabel: event.title,
    metadata: {
      before: { status: event.status },
      after: { status: 'Published' },
    },
  })

  return { success: true }
}

export async function unpublishEventAdminHandler(data: { eventId: string }) {
  const admin = await requirePlatformAdmin()

  const event = await db.event.findFirst({
    where: { id: data.eventId, deletedAt: null },
    select: { id: true, title: true, status: true },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')

  const ticketCount = await db.ticket.count({
    where: { orderItem: { order: { eventId: event.id, deletedAt: null } } },
  })
  assertLifecycle(canUnpublishEvent({ ticketCount }))

  await db.event.update({ where: { id: event.id }, data: { status: 'Draft' } })

  await writeAuditLog({
    actorId: admin.id,
    action: 'EventUnpublished',
    targetType: 'Event',
    targetId: event.id,
    targetLabel: event.title,
    metadata: { before: { status: event.status }, after: { status: 'Draft' } },
  })

  return { success: true }
}

/**
 * Archiveren is de manier om een evenement van de storefront te halen wanneer
 * er al tickets verkocht zijn: de historie, bestellingen en tickets blijven
 * volledig intact.
 */
export async function archiveEventAdminHandler(data: { eventId: string }) {
  const admin = await requirePlatformAdmin()

  const event = await db.event.findFirst({
    where: { id: data.eventId, deletedAt: null },
    select: { id: true, title: true, status: true },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')

  await db.event.update({
    where: { id: event.id },
    data: { status: 'Archived' },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: 'EventArchived',
    targetType: 'Event',
    targetId: event.id,
    targetLabel: event.title,
    metadata: {
      before: { status: event.status },
      after: { status: 'Archived' },
    },
  })

  return { success: true }
}

export async function deleteEventAdminHandler(data: { eventId: string }) {
  const admin = await requirePlatformAdmin()

  const event = await db.event.findFirst({
    where: { id: data.eventId, deletedAt: null },
    select: { id: true, title: true, status: true },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')

  const orderCount = await db.order.count({
    where: { eventId: event.id, deletedAt: null },
  })
  assertLifecycle(canDeleteEvent({ status: event.status, orderCount }))

  await db.event.update({
    where: { id: event.id },
    data: { deletedAt: new Date() },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: 'EventDeleted',
    targetType: 'Event',
    targetId: event.id,
    targetLabel: event.title,
  })

  return { success: true }
}
