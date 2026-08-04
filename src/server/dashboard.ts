import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedOrganization } from '#/lib/org-guard.server.ts'

/**
 * Server functions voor het organisatiedashboard (Fase 8).
 *
 * Toont uitsluitend statistieken, open acties en recente activiteit — nooit
 * instellingen (BUSINESS_RULES §12). Alles wordt live opgehaald, geschaald op
 * indexen (eventId/orderId), net als de rest van de codebase.
 */

const ZERO_STATS = {
  newOrders: 0,
  openPayments: 0,
  openActions: 0,
  revenueCents: 0,
  ticketsSold: 0,
}

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const events = await db.event.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      select: { id: true },
    })
    const eventIds = events.map((event) => event.id)

    if (eventIds.length === 0) {
      return ZERO_STATS
    }

    const now = new Date()

    const [newOrders, openPayments, openActions, revenue, ticketsSold] =
      await Promise.all([
        db.order.count({
          where: {
            eventId: { in: eventIds },
            deletedAt: null,
            orderStatus: 'PendingPayment',
            expiresAt: { gt: now },
          },
        }),
        db.order.count({
          where: {
            eventId: { in: eventIds },
            deletedAt: null,
            orderStatus: 'AwaitingReview',
          },
        }),
        db.order.count({
          where: {
            eventId: { in: eventIds },
            deletedAt: null,
            OR: [
              { orderStatus: 'AwaitingReview' },
              { orderStatus: 'PendingPayment', expiresAt: { gt: now } },
            ],
          },
        }),
        db.order.aggregate({
          where: {
            eventId: { in: eventIds },
            deletedAt: null,
            orderStatus: { in: ['Paid', 'Completed'] },
          },
          _sum: { totalCents: true },
        }),
        db.ticket.count({
          where: {
            status: { in: ['Issued', 'Sent', 'CheckedIn'] },
            orderItem: {
              order: { eventId: { in: eventIds }, deletedAt: null },
            },
          },
        }),
      ])

    return {
      newOrders,
      openPayments,
      openActions,
      revenueCents: revenue._sum.totalCents ?? 0,
      ticketsSold,
    }
  },
)

export const listRecentOrders = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const events = await db.event.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      select: { id: true },
    })
    const eventIds = events.map((event) => event.id)

    if (eventIds.length === 0) {
      return []
    }

    return db.order.findMany({
      where: { eventId: { in: eventIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        event: { select: { id: true, title: true } },
      },
    })
  },
)
