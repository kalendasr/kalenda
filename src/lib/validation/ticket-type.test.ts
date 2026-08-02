import { describe, expect, it } from 'vitest'

import { ticketTypeSchema } from '#/lib/validation/ticket-type.ts'

const base = {
  name: 'Regular',
  price: '50,00',
  quantity: 100,
  minimumPerOrder: 1,
  maximumPerOrder: 10,
  visible: true,
}

describe('ticketTypeSchema', () => {
  it('accepteert een geldig tickettype en zet de prijs om naar centen', () => {
    const result = ticketTypeSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priceCents).toBe(5000)
    }
  })

  it('staat een gratis ticket toe (prijs 0)', () => {
    const result = ticketTypeSchema.safeParse({ ...base, price: '0' })
    expect(result.success).toBe(true)
  })

  it('wijst een ongeldige prijs af', () => {
    expect(
      ticketTypeSchema.safeParse({ ...base, price: 'gratis' }).success,
    ).toBe(false)
  })

  it('eist een capaciteit van minimaal 1 (BR-301)', () => {
    expect(ticketTypeSchema.safeParse({ ...base, quantity: 0 }).success).toBe(
      false,
    )
  })

  it('eist dat het maximum niet lager is dan het minimum', () => {
    const result = ticketTypeSchema.safeParse({
      ...base,
      minimumPerOrder: 5,
      maximumPerOrder: 2,
    })
    expect(result.success).toBe(false)
  })

  it('eist dat het verkoopeinde na de start ligt (BR-302)', () => {
    const result = ticketTypeSchema.safeParse({
      ...base,
      salesStart: '2026-09-01T20:00',
      salesEnd: '2026-09-01T18:00',
    })
    expect(result.success).toBe(false)
  })
})
