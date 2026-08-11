import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { REALISED_ORDER_STATUSES } from '#/lib/order-status.ts'

/**
 * Kerncijfers voor het adminoverzicht (Fase 12).
 *
 * Alle cijfers komen rechtstreeks uit de database; er staat nergens een
 * hardgecodeerd getal. "Verkoopvolume" telt uitsluitend
 * `REALISED_ORDER_STATUSES` — dezelfde definitie als de
 * organisatorrapportage, zodat platform- en eventcijfers nooit uiteenlopen en
 * geannuleerde of verlopen bestellingen nooit als omzet lezen.
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
      ticketsCheckedIn,
      salesVolume,
      customers,
    ] = await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { deletedAt: null } }),
      db.event.count({ where: { deletedAt: null } }),
      db.event.count({ where: { status: 'Published', deletedAt: null } }),
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { blockedAt: { not: null }, deletedAt: null } }),
      db.order.count({ where: { deletedAt: null } }),
      db.order.groupBy({
        by: ['orderStatus'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      db.ticket.count({
        where: { status: { in: ['Issued', 'Sent', 'CheckedIn'] } },
      }),
      db.ticket.count({ where: { status: 'CheckedIn' } }),
      db.order.aggregate({
        where: {
          deletedAt: null,
          orderStatus: { in: [...REALISED_ORDER_STATUSES] },
        },
        _sum: { totalCents: true },
      }),
      db.customer.count({ where: { deletedAt: null } }),
    ])

    return {
      organizations,
      activeOrganizations,
      events,
      publishedEvents,
      users,
      blockedUsers,
      customers,
      orders,
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((row) => [row.orderStatus, row._count._all]),
      ),
      ticketsIssued,
      ticketsCheckedIn,
      salesVolumeCents: salesVolume._sum.totalCents ?? 0,
    }
  },
)

/**
 * Recente activiteit voor het overzichtsscherm: de laatste bestellingen,
 * registraties en aangemaakte evenementen. Bewust klein gehouden (10 per
 * lijst) — dit is een dashboard, geen zoekscherm; daarvoor zijn de
 * lijstpagina's.
 */
export const getPlatformActivity = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    const [recentOrders, recentUsers, recentEvents] = await Promise.all([
      db.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          paymentStatus: true,
          totalCents: true,
          expiresAt: true,
          createdAt: true,
          event: { select: { id: true, title: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      db.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          isPlatformAdmin: true,
          blockedAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      db.event.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
    ])

    return { recentOrders, recentUsers, recentEvents }
  },
)
