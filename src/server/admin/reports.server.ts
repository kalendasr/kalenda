import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { REALISED_ORDER_STATUSES } from '#/lib/order-status.ts'
import type { PlatformReportInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Platformrapportage (Fase 12).
 *
 * Financiële regels die hier niet onderhandelbaar zijn:
 * - Omzet is uitsluitend `REALISED_ORDER_STATUSES` (Paid/Completed) op
 *   niet-verwijderde bestellingen. Geannuleerde, verlopen en nog te
 *   beoordelen bestellingen zijn géén omzet.
 * - Die uitgesloten bedragen worden apart teruggegeven en in de UI ook apart
 *   getoond — niet weggelaten. Een beheerder moet kunnen zien hoeveel er
 *   misloopt, zonder dat het als opbrengst leest.
 * - Alle bedragen zijn hele centen in SRD; het platform kent maar één valuta
 *   (BR-400) en rekent nergens met floats.
 *
 * Tijdzone: periodegrenzen worden in Suriname-tijd (UTC-3) berekend, zodat
 * "vandaag" hetzelfde betekent als in de rest van de applicatie.
 */

const SURINAME_UTC_OFFSET_HOURS = -3

/** Begin van de gekozen periode, of `null` voor "alles". */
export function periodStart(
  period: PlatformReportInput['period'],
  now: Date = new Date(),
): Date | null {
  if (period === 'all') return null

  const days =
    period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365

  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  // Terug naar middernacht Suriname-tijd, zodat een dag niet halverwege begint.
  const shifted = new Date(
    start.getTime() + SURINAME_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  )
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(
    shifted.getTime() - SURINAME_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  )
}

export async function getPlatformReportHandler(data: PlatformReportInput) {
  await requirePlatformAdmin()

  const start = periodStart(data.period)
  const createdAt = start ? { gte: start } : undefined

  const orderScope: Prisma.OrderWhereInput = { deletedAt: null, createdAt }
  const realisedScope: Prisma.OrderWhereInput = {
    ...orderScope,
    orderStatus: { in: [...REALISED_ORDER_STATUSES] },
  }

  const [
    realised,
    lost,
    pending,
    ticketsSold,
    ticketsCheckedIn,
    newUsers,
    newOrganizations,
    newEvents,
    revenueByEvent,
  ] = await Promise.all([
    db.order.aggregate({
      where: realisedScope,
      _sum: { totalCents: true, serviceFeeCents: true },
      _count: { _all: true },
    }),
    // Niet-omzet, expliciet apart: bestellingen die nooit geld worden.
    db.order.aggregate({
      where: {
        ...orderScope,
        orderStatus: { in: ['Cancelled', 'Expired'] },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    // Nog onbeslist: kan alsnog omzet worden, maar is het nu niet.
    db.order.aggregate({
      where: {
        ...orderScope,
        orderStatus: { in: ['PendingPayment', 'AwaitingReview'] },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    db.orderItem.aggregate({
      where: { order: realisedScope },
      _sum: { quantity: true },
    }),
    db.ticket.count({
      where: {
        status: 'CheckedIn',
        orderItem: { order: { deletedAt: null } },
        checkedInAt: start ? { gte: start } : undefined,
      },
    }),
    db.user.count({ where: { deletedAt: null, createdAt } }),
    db.organization.count({ where: { deletedAt: null, createdAt } }),
    db.event.count({ where: { deletedAt: null, createdAt } }),
    // Eén aggregatie per evenement. De database telt de bestellingen; wij
    // zien alleen het resultaat per event (hooguit enkele duizenden rijen),
    // nooit de bestellingen zelf.
    db.order.groupBy({
      by: ['eventId'],
      where: realisedScope,
      _sum: { totalCents: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCents: 'desc' } },
    }),
  ])

  const events = revenueByEvent.length
    ? await db.event.findMany({
        where: { id: { in: revenueByEvent.map((row) => row.eventId) } },
        select: {
          id: true,
          title: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      })
    : []
  const eventById = new Map(events.map((event) => [event.id, event]))

  const topEvents = revenueByEvent.slice(0, 10).map((row) => ({
    eventId: row.eventId,
    title: eventById.get(row.eventId)?.title ?? 'Verwijderd evenement',
    organizationName: eventById.get(row.eventId)?.organization.name ?? '—',
    revenueCents: row._sum.totalCents ?? 0,
    orderCount: row._count._all,
  }))

  // Prisma kan niet groeperen over een relatie heen (de organisatie zit
  // achter het evenement), dus rollen we de al geaggregeerde eventrijen op
  // naar organisatieniveau. Dat is een lijst per evenement, geen lijst per
  // bestelling — daarom schaalt het mee.
  const revenueByOrganization = new Map<
    string,
    { name: string; revenueCents: number; orderCount: number }
  >()
  for (const row of revenueByEvent) {
    const event = eventById.get(row.eventId)
    if (!event) continue
    const entry = revenueByOrganization.get(event.organizationId) ?? {
      name: event.organization.name,
      revenueCents: 0,
      orderCount: 0,
    }
    entry.revenueCents += row._sum.totalCents ?? 0
    entry.orderCount += row._count._all
    revenueByOrganization.set(event.organizationId, entry)
  }
  const topOrganizations = [...revenueByOrganization.entries()]
    .map(([organizationId, entry]) => ({ organizationId, ...entry }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10)

  return {
    period: data.period,
    startsAt: start,
    revenue: {
      realisedCents: realised._sum.totalCents ?? 0,
      serviceFeeCents: realised._sum.serviceFeeCents ?? 0,
      realisedOrderCount: realised._count._all,
      lostCents: lost._sum.totalCents ?? 0,
      lostOrderCount: lost._count._all,
      pendingCents: pending._sum.totalCents ?? 0,
      pendingOrderCount: pending._count._all,
    },
    ticketsSold: ticketsSold._sum.quantity ?? 0,
    ticketsCheckedIn,
    newUsers,
    newOrganizations,
    newEvents,
    topEvents,
    topOrganizations,
  }
}
