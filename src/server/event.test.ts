import { afterEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { notify } from '#/server/notifications.server.ts'
import { notifyEventChanged } from '#/server/event-notifications.server.ts'
import { hasEventTimeChanged, hasVenueChanged } from '#/server/event.ts'

// event.ts importeert deze modules op module-niveau; ze raken db/auth aan die
// zonder env-variabelen niet instantieerbaar zijn in een testomgeving. Vitest
// hoist `vi.mock` altijd naar de top van het bestand, dus de volgorde hier
// (ná de imports) is voor de uitvoering geen probleem.
vi.mock('#/lib/db.server.ts', () => ({
  db: { order: { findMany: vi.fn() } },
}))
vi.mock('#/lib/session.server.ts', () => ({ requireUser: vi.fn() }))
vi.mock('#/lib/event-guard.server.ts', () => ({ requireOwnedEvent: vi.fn() }))
vi.mock('#/lib/org-guard.server.ts', () => ({
  requireOwnedOrganization: vi.fn(),
}))
vi.mock('#/server/notifications.server.ts', () => ({ notify: vi.fn() }))

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * Diff-logica achter BR-904: een pushmelding mag alleen bij een échte
 * wijziging, nooit bij een no-op save van hetzelfde formulier.
 */
describe('hasEventTimeChanged', () => {
  it('is false wanneer de begintijd exact gelijk blijft', () => {
    const a = new Date('2026-09-01T20:00:00Z')
    const b = new Date('2026-09-01T20:00:00Z')
    expect(hasEventTimeChanged(a, b)).toBe(false)
  })

  it('is true wanneer de begintijd verschuift', () => {
    const before = new Date('2026-09-01T20:00:00Z')
    const after = new Date('2026-09-01T21:00:00Z')
    expect(hasEventTimeChanged(before, after)).toBe(true)
  })

  it('is false wanneer beide leeg zijn (event zonder datum)', () => {
    expect(hasEventTimeChanged(null, null)).toBe(false)
  })

  it('is true wanneer er voor het eerst een datum wordt gezet', () => {
    expect(hasEventTimeChanged(null, new Date('2026-09-01T20:00:00Z'))).toBe(
      true,
    )
  })

  it('is true wanneer de datum wordt weggehaald', () => {
    expect(hasEventTimeChanged(new Date('2026-09-01T20:00:00Z'), null)).toBe(
      true,
    )
  })
})

describe('hasVenueChanged', () => {
  const base = {
    name: 'Torarica',
    address: 'Kernkampweg 1',
    district: 'Paramaribo',
    country: 'Suriname',
  }

  it('is false wanneer alle velden gelijk blijven', () => {
    expect(hasVenueChanged(base, { ...base })).toBe(false)
  })

  it('is true wanneer alleen de naam verandert', () => {
    expect(hasVenueChanged(base, { ...base, name: 'Anders' })).toBe(true)
  })

  it('is true wanneer alleen het adres verandert', () => {
    expect(hasVenueChanged(base, { ...base, address: 'Andere straat 2' })).toBe(
      true,
    )
  })

  it('is true wanneer een optioneel veld van waarde naar leeg gaat', () => {
    expect(hasVenueChanged(base, { ...base, district: null })).toBe(true)
  })

  it('is true wanneer alleen het land verandert', () => {
    expect(hasVenueChanged(base, { ...base, country: 'Guyana' })).toBe(true)
  })
})

/**
 * BR-904: alle klanten met een actieve bestelling voor het event krijgen de
 * melding; geannuleerde/verlopen bestellingen worden al op databaseniveau
 * uitgesloten door de where-clause.
 */
describe('notifyEventChanged', () => {
  it('vraagt alleen niet-geannuleerde/niet-verlopen bestellingen van dit event op', async () => {
    vi.mocked(db.order.findMany).mockResolvedValue([])

    await notifyEventChanged('event-1', 'Zomerfeest', 'time')

    expect(db.order.findMany).toHaveBeenCalledWith({
      where: {
        eventId: 'event-1',
        deletedAt: null,
        orderStatus: { notIn: ['Cancelled', 'Expired'] },
      },
      select: { orderNumber: true, customerId: true },
    })
  })

  it('stuurt event.changed naar elke klant met een actieve bestelling', async () => {
    vi.mocked(db.order.findMany).mockResolvedValue([
      { orderNumber: 'ORD-1', customerId: 'cust-1' },
      { orderNumber: 'ORD-2', customerId: 'cust-2' },
    ] as any)

    await notifyEventChanged('event-1', 'Zomerfeest', 'venue')

    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenCalledWith(
      'event.changed',
      { kind: 'customer', customerId: 'cust-1' },
      { orderNumber: 'ORD-1', eventTitle: 'Zomerfeest', change: 'venue' },
    )
    expect(notify).toHaveBeenCalledWith(
      'event.changed',
      { kind: 'customer', customerId: 'cust-2' },
      { orderNumber: 'ORD-2', eventTitle: 'Zomerfeest', change: 'venue' },
    )
  })

  it('stuurt niets wanneer er geen actieve bestellingen zijn', async () => {
    vi.mocked(db.order.findMany).mockResolvedValue([])

    await notifyEventChanged('event-1', 'Zomerfeest', 'cancelled')

    expect(notify).not.toHaveBeenCalled()
  })
})
