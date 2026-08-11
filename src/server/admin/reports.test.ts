import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  getPlatformReportHandler,
  periodStart,
} from '#/server/admin/reports.server.ts'

// De adminmodules importeren db en de guard op module-niveau; die raken
// omgevingsvariabelen aan die in een test niet bestaan. Vitest hoist `vi.mock`
// altijd naar de top van het bestand, dus de volgorde hier (ná de imports) is
// voor de uitvoering geen probleem — het houdt alleen de import-volgorde net.
vi.mock('#/lib/db.server.ts', () => ({
  db: {
    order: { aggregate: vi.fn(), groupBy: vi.fn() },
    orderItem: { aggregate: vi.fn() },
    ticket: { count: vi.fn() },
    user: { count: vi.fn() },
    organization: { count: vi.fn() },
    event: { count: vi.fn(), findMany: vi.fn() },
  },
}))
vi.mock('#/lib/admin-guard.server.ts', () => ({
  requirePlatformAdmin: vi.fn(),
}))

/**
 * De belangrijkste regel van dit scherm: mislukte, geannuleerde en verlopen
 * bestellingen mogen nooit als omzet gelezen worden (Fase 12).
 */

const ADMIN = {
  id: 'admin-1',
  name: 'Kim Ramdien',
  email: 'kim@kalenda.sr',
  image: null,
  firstName: 'Kim',
  lastName: 'Ramdien',
  phone: null,
  isPlatformAdmin: true,
}

function aggregate(totalCents: number, count: number, serviceFeeCents = 0) {
  return {
    _sum: { totalCents, serviceFeeCents },
    _count: { _all: count },
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requirePlatformAdmin).mockResolvedValue(ADMIN)

  vi.mocked(db.order.aggregate)
    .mockResolvedValueOnce(aggregate(500_00, 10, 25_00)) // gerealiseerd
    .mockResolvedValueOnce(aggregate(300_00, 6)) // geannuleerd/verlopen
    .mockResolvedValueOnce(aggregate(120_00, 3)) // nog onbeslist
  vi.mocked(db.orderItem.aggregate).mockResolvedValue({
    _sum: { quantity: 42 },
  } as never)
  vi.mocked(db.ticket.count).mockResolvedValue(18)
  vi.mocked(db.user.count).mockResolvedValue(7)
  vi.mocked(db.organization.count).mockResolvedValue(2)
  vi.mocked(db.event.count).mockResolvedValue(3)
  vi.mocked(db.order.groupBy).mockResolvedValue([] as never)
  vi.mocked(db.event.findMany).mockResolvedValue([] as never)
})

describe('autorisatie', () => {
  it('geeft geen cijfers zonder beheerdersrol', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(getPlatformReportHandler({ period: '30d' })).rejects.toThrow(
      'FORBIDDEN',
    )
    expect(db.order.aggregate).not.toHaveBeenCalled()
  })
})

describe('omzetafbakening', () => {
  it('telt uitsluitend betaalde en afgeronde bestellingen als omzet', async () => {
    await getPlatformReportHandler({ period: 'all' })

    const revenueWhere = vi.mocked(db.order.aggregate).mock.calls[0]?.[0]?.where

    expect(revenueWhere).toMatchObject({
      deletedAt: null,
      orderStatus: { in: ['Paid', 'Completed'] },
    })
  })

  it('houdt geannuleerde en verlopen bedragen apart van de omzet', async () => {
    const report = await getPlatformReportHandler({ period: 'all' })

    expect(report.revenue.realisedCents).toBe(500_00)
    expect(report.revenue.lostCents).toBe(300_00)
    expect(report.revenue.pendingCents).toBe(120_00)

    // De cruciale eigenschap: verloren en openstaande bedragen zitten niet in
    // de omzet verwerkt.
    expect(report.revenue.realisedCents).not.toBe(500_00 + 300_00 + 120_00)
  })

  it('vraagt de verloren bedragen op met precies de niet-betaalde statussen', async () => {
    await getPlatformReportHandler({ period: 'all' })

    expect(
      vi.mocked(db.order.aggregate).mock.calls[1]?.[0]?.where,
    ).toMatchObject({ orderStatus: { in: ['Cancelled', 'Expired'] } })
    expect(
      vi.mocked(db.order.aggregate).mock.calls[2]?.[0]?.where,
    ).toMatchObject({
      orderStatus: { in: ['PendingPayment', 'AwaitingReview'] },
    })
  })

  it('telt verkochte tickets alleen binnen gerealiseerde bestellingen', async () => {
    await getPlatformReportHandler({ period: 'all' })

    expect(
      vi.mocked(db.orderItem.aggregate).mock.calls[0]?.[0]?.where,
    ).toMatchObject({
      order: { orderStatus: { in: ['Paid', 'Completed'] } },
    })
  })

  it('geeft servicekosten apart terug — nooit ingehouden op de omzet', async () => {
    const report = await getPlatformReportHandler({ period: 'all' })

    expect(report.revenue.serviceFeeCents).toBe(25_00)
    expect(report.revenue.realisedCents).toBe(500_00)
  })
})

describe('periodeafbakening', () => {
  it('geeft geen begindatum voor "alles"', () => {
    expect(periodStart('all')).toBeNull()
  })

  it('begint op middernacht Suriname-tijd (UTC-3)', () => {
    const start = periodStart('7d', new Date('2026-08-11T15:30:00Z'))

    expect(start).not.toBeNull()
    // Middernacht in Paramaribo is 03:00 UTC.
    expect(start?.toISOString()).toBe('2026-08-04T03:00:00.000Z')
  })

  it('kijkt verder terug naarmate de periode langer is', () => {
    const now = new Date('2026-08-11T12:00:00Z')
    const week = periodStart('7d', now)!
    const quarter = periodStart('90d', now)!
    const year = periodStart('12m', now)!

    expect(quarter.getTime()).toBeLessThan(week.getTime())
    expect(year.getTime()).toBeLessThan(quarter.getTime())
  })

  it('filtert de queries op de gekozen periode', async () => {
    await getPlatformReportHandler({ period: '30d' })

    const where = vi.mocked(db.order.aggregate).mock.calls[0]?.[0]?.where

    expect(where?.createdAt).toEqual({ gte: expect.any(Date) })
  })
})

describe('omzet per organisatie', () => {
  it('rolt de eventaggregatie op zonder de bestellingen zelf op te halen', async () => {
    vi.mocked(db.order.groupBy).mockResolvedValue([
      { eventId: 'event-1', _sum: { totalCents: 300_00 }, _count: { _all: 4 } },
      { eventId: 'event-2', _sum: { totalCents: 200_00 }, _count: { _all: 3 } },
    ] as never)
    vi.mocked(db.event.findMany).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Zomerfeest',
        organizationId: 'org-1',
        organization: { name: 'Wan Pipel' },
      },
      {
        id: 'event-2',
        title: 'Winterfeest',
        organizationId: 'org-1',
        organization: { name: 'Wan Pipel' },
      },
    ] as never)

    const report = await getPlatformReportHandler({ period: 'all' })

    expect(report.topOrganizations).toEqual([
      {
        organizationId: 'org-1',
        name: 'Wan Pipel',
        revenueCents: 500_00,
        orderCount: 7,
      },
    ])
    expect(report.topEvents[0]?.title).toBe('Zomerfeest')
  })

  it('blijft leesbaar wanneer een evenement inmiddels verwijderd is', async () => {
    vi.mocked(db.order.groupBy).mockResolvedValue([
      { eventId: 'weg', _sum: { totalCents: 100_00 }, _count: { _all: 1 } },
    ] as never)

    const report = await getPlatformReportHandler({ period: 'all' })

    expect(report.topEvents[0]?.title).toBe('Verwijderd evenement')
  })
})
