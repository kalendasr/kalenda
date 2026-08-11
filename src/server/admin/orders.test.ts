import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { listOrdersHandler } from '#/server/admin/orders.server.ts'
import { effectiveOrderStatus } from '#/lib/order-status.ts'

// De adminmodules importeren db en de guard op module-niveau; die raken
// omgevingsvariabelen aan die in een test niet bestaan. Vitest hoist `vi.mock`
// altijd naar de top van het bestand, dus de volgorde hier (ná de imports) is
// voor de uitvoering geen probleem — het houdt alleen de import-volgorde net.
vi.mock('#/lib/db.server.ts', () => ({
  db: { order: { findMany: vi.fn(), count: vi.fn() } },
}))
vi.mock('#/lib/admin-guard.server.ts', () => ({
  requirePlatformAdmin: vi.fn(),
}))

/**
 * Bestelstatus en betaalstatus zijn twee onafhankelijke assen (BR-505 vs
 * BR-607). Deze suite bewaakt dat ze los gefilterd en los teruggegeven worden.
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

const INPUT = {
  page: 1,
  pageSize: 25 as const,
  orderStatus: 'all' as const,
  paymentStatus: 'all' as const,
  sort: 'createdAt' as const,
  direction: 'desc' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requirePlatformAdmin).mockResolvedValue(ADMIN)
  vi.mocked(db.order.findMany).mockResolvedValue([])
  vi.mocked(db.order.count).mockResolvedValue(0)
})

describe('autorisatie', () => {
  it('geeft geen bestellingen zonder beheerdersrol', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(listOrdersHandler(INPUT)).rejects.toThrow('FORBIDDEN')
    expect(db.order.findMany).not.toHaveBeenCalled()
  })
})

describe('filters', () => {
  it('sluit verwijderde bestellingen altijd uit', async () => {
    await listOrdersHandler(INPUT)

    expect(db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    )
  })

  it('filtert bestelstatus en betaalstatus onafhankelijk van elkaar', async () => {
    await listOrdersHandler({
      ...INPUT,
      orderStatus: 'Cancelled',
      paymentStatus: 'Verified',
    })

    expect(
      vi.mocked(db.order.findMany).mock.calls[0]?.[0]?.where,
    ).toMatchObject({
      orderStatus: 'Cancelled',
      paymentStatus: 'Verified',
    })
  })

  it('zoekt een ordernummer exact op, niet met een scan', async () => {
    await listOrdersHandler({ ...INPUT, search: 'kal-1234' })

    const where = vi.mocked(db.order.findMany).mock.calls[0]?.[0]?.where

    expect(where?.OR?.[0]).toEqual({ orderNumber: 'KAL-1234' })
  })

  it('begrenst de query met skip en take', async () => {
    await listOrdersHandler({ ...INPUT, page: 4, pageSize: 50 })

    expect(db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 150, take: 50 }),
    )
  })
})

describe('financiële velden', () => {
  it('levert alle bedragen apart, zodat de UI niets hoeft te herberekenen', async () => {
    await listOrdersHandler(INPUT)

    const select = vi.mocked(db.order.findMany).mock.calls[0]?.[0]?.select ?? {}

    expect(select).toMatchObject({
      subtotalCents: true,
      serviceFeeCents: true,
      discountCents: true,
      totalCents: true,
      orderStatus: true,
      paymentStatus: true,
    })
  })

  it('haalt `expiresAt` op, zodat de lijst verlopen bestellingen kan tonen', async () => {
    await listOrdersHandler(INPUT)

    expect(
      vi.mocked(db.order.findMany).mock.calls[0]?.[0]?.select?.expiresAt,
    ).toBe(true)
  })
})

describe('effectieve status (BR-506, lazy expiry)', () => {
  it('toont een onbetaalde bestelling voorbij zijn termijn als verlopen', () => {
    expect(
      effectiveOrderStatus(
        {
          orderStatus: 'PendingPayment',
          expiresAt: new Date('2026-08-01T00:00:00Z'),
        },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe('Expired')
  })

  it('laat een bestelling ter controle staan, ook na de termijn', () => {
    expect(
      effectiveOrderStatus(
        {
          orderStatus: 'AwaitingReview',
          expiresAt: new Date('2026-08-01T00:00:00Z'),
        },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe('AwaitingReview')
  })

  it('raakt een betaalde bestelling nooit aan', () => {
    expect(
      effectiveOrderStatus(
        { orderStatus: 'Paid', expiresAt: new Date('2026-08-01T00:00:00Z') },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe('Paid')
  })
})
