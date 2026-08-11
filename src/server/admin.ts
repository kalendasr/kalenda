import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'

/**
 * Server functions voor het Platform Admin-workspace (Fase 11).
 *
 * Losstaand domein van Organization/Event: dit is de enige plek in de
 * codebase die platformbreed leest (over alle organisaties heen) en mag
 * ingrijpen buiten het eigenaarschapsmodel van BR §13. Iedere handler begint
 * daarom met `requirePlatformAdmin()` in plaats van `requireUser()` +
 * eigenaarschapscontrole.
 *
 * Ingrijpen hergebruikt bestaande statusvelden in plaats van een parallel
 * systeem: een organisatie "deactiveren" is dezelfde soft delete
 * (`deletedAt`) die `requireOwnedOrganization` al filtert — de organisator
 * verliest meteen toegang tot de workspace en de events verdwijnen van de
 * storefront (`publishedWhere` filtert op `organization.deletedAt`). Een
 * event "archiveren" is dezelfde `Archived`-status als de organisator zelf
 * kan zetten. Gebruikers blokkeren is de enige echt nieuwe toestand
 * (`blockedAt`), omdat daar nog niets voor bestond.
 */

export const getPlatformStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    const [
      organizations,
      activeOrganizations,
      events,
      publishedEvents,
      users,
      blockedUsers,
      orders,
      ordersByStatus,
      ticketsIssued,
      salesVolume,
    ] = await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { deletedAt: null } }),
      db.event.count({ where: { deletedAt: null } }),
      db.event.count({ where: { status: 'Published', deletedAt: null } }),
      db.user.count(),
      db.user.count({ where: { blockedAt: { not: null } } }),
      db.order.count({ where: { deletedAt: null } }),
      db.order.groupBy({
        by: ['orderStatus'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      db.ticket.count({
        where: { status: { in: ['Issued', 'Sent', 'CheckedIn'] } },
      }),
      db.order.aggregate({
        where: { deletedAt: null, orderStatus: { in: ['Paid', 'Completed'] } },
        _sum: { totalCents: true },
      }),
    ])

    return {
      organizations,
      activeOrganizations,
      events,
      publishedEvents,
      users,
      blockedUsers,
      orders,
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((row) => [row.orderStatus, row._count._all]),
      ),
      ticketsIssued,
      salesVolumeCents: salesVolume._sum.totalCents ?? 0,
    }
  },
)

export const listOrganizationsAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    return db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        isVerified: true,
        deletedAt: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { events: true } },
      },
    })
  },
)

export const setOrganizationActive = createServerFn({ method: 'POST' })
  .validator(z.object({ organizationId: z.uuid(), active: z.boolean() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    return db.organization.update({
      where: { id: data.organizationId },
      data: { deletedAt: data.active ? null : new Date() },
    })
  })

export const listEventsAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    return db.event.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    })
  },
)

export const archiveEventAdmin = createServerFn({ method: 'POST' })
  .validator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    return db.event.update({
      where: { id: data.eventId },
      data: { status: 'Archived' },
    })
  })

export const listUsersAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    return db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isPlatformAdmin: true,
        blockedAt: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    })
  },
)

export const setUserBlocked = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.uuid(), blocked: z.boolean() }))
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin()

    if (data.userId === admin.id) {
      throw new Error('CANNOT_BLOCK_SELF')
    }

    return db.user.update({
      where: { id: data.userId },
      data: { blockedAt: data.blocked ? new Date() : null },
    })
  })
