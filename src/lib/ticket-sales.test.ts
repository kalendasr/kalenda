import { describe, expect, it } from 'vitest'

import {
  availableQuantity,
  eventAvailability,
  isOnSale,
  ticketSaleStatus,
} from '#/lib/ticket-sales.ts'
import type { SaleableTicketType } from '#/lib/ticket-sales.ts'

const now = new Date('2026-06-01T12:00:00-03:00')

function type(overrides: Partial<SaleableTicketType> = {}): SaleableTicketType {
  return {
    quantity: 100,
    visible: true,
    salesStart: null,
    salesEnd: null,
    ...overrides,
  }
}

describe('ticketSaleStatus', () => {
  it('is on-sale zonder verkoopvenster en met capaciteit', () => {
    expect(ticketSaleStatus(type(), now)).toBe('on-sale')
  })

  it('is hidden wanneer niet zichtbaar', () => {
    expect(ticketSaleStatus(type({ visible: false }), now)).toBe('hidden')
  })

  it('is sold-out bij capaciteit 0', () => {
    expect(ticketSaleStatus(type({ quantity: 0 }), now)).toBe('sold-out')
  })

  it('is not-started vóór de verkoopstart', () => {
    const status = ticketSaleStatus(
      type({ salesStart: new Date('2026-07-01T00:00:00-03:00') }),
      now,
    )
    expect(status).toBe('not-started')
  })

  it('is ended na het verkoopeinde', () => {
    const status = ticketSaleStatus(
      type({ salesEnd: new Date('2026-05-01T00:00:00-03:00') }),
      now,
    )
    expect(status).toBe('ended')
  })

  it('is on-sale binnen het verkoopvenster', () => {
    const status = ticketSaleStatus(
      type({
        salesStart: new Date('2026-05-01T00:00:00-03:00'),
        salesEnd: new Date('2026-07-01T00:00:00-03:00'),
      }),
      now,
    )
    expect(status).toBe('on-sale')
  })
})

describe('isOnSale', () => {
  it('weerspiegelt de status', () => {
    expect(isOnSale(type(), now)).toBe(true)
    expect(isOnSale(type({ visible: false }), now)).toBe(false)
  })
})

describe('availableQuantity', () => {
  it('trekt gereserveerde tickets af van de capaciteit', () => {
    expect(availableQuantity({ quantity: 100 }, 30)).toBe(70)
    expect(availableQuantity({ quantity: 100 })).toBe(100)
  })

  it('gaat nooit onder nul', () => {
    expect(availableQuantity({ quantity: 10 }, 15)).toBe(0)
  })
})

describe('ticketSaleStatus met reserveringen', () => {
  it('is uitverkocht wanneer alles gereserveerd is', () => {
    expect(ticketSaleStatus(type({ quantity: 5 }), now, 5)).toBe('sold-out')
  })
})

describe('eventAvailability', () => {
  it('geeft null als vanaf-prijs zonder tickettypes', () => {
    const result = eventAvailability([])
    expect(result.priceFromCents).toBeNull()
    expect(result.isFree).toBe(false)
    expect(result.almostSoldOut).toBe(false)
    expect(result.soldOut).toBe(false)
  })

  it('neemt de laagste prijs als vanaf-prijs', () => {
    const result = eventAvailability([
      { priceCents: 500, quantity: 10, reserved: 0 },
      { priceCents: 200, quantity: 10, reserved: 0 },
    ])
    expect(result.priceFromCents).toBe(200)
    expect(result.isFree).toBe(false)
  })

  it('is bijna uitverkocht op precies de drempel (10 resterend)', () => {
    const result = eventAvailability([
      { priceCents: 100, quantity: 20, reserved: 10 },
    ])
    expect(result.remaining).toBe(10)
    expect(result.almostSoldOut).toBe(true)
    expect(result.soldOut).toBe(false)
  })

  it('is niet meer bijna uitverkocht net boven de drempel (11 resterend)', () => {
    const result = eventAvailability([
      { priceCents: 100, quantity: 20, reserved: 9 },
    ])
    expect(result.remaining).toBe(11)
    expect(result.almostSoldOut).toBe(false)
  })

  it('is uitverkocht bij 0 resterend, niet "bijna"', () => {
    const result = eventAvailability([
      { priceCents: 100, quantity: 5, reserved: 5 },
    ])
    expect(result.remaining).toBe(0)
    expect(result.soldOut).toBe(true)
    expect(result.almostSoldOut).toBe(false)
  })

  it('telt over meerdere tickettypes op', () => {
    const result = eventAvailability([
      { priceCents: 100, quantity: 5, reserved: 5 },
      { priceCents: 200, quantity: 5, reserved: 0 },
    ])
    expect(result.capacity).toBe(10)
    expect(result.remaining).toBe(5)
    expect(result.soldOut).toBe(false)
  })
})
