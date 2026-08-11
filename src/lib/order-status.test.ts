import { describe, expect, it } from 'vitest'

import {
  REJECTION_GRACE_MS,
  deadlineAfterRejection,
  effectiveOrderStatus,
  isReserving,
} from '#/lib/order-status.ts'

const now = new Date('2026-06-01T12:00:00-03:00')
const past = new Date('2026-05-30T12:00:00-03:00')
const future = new Date('2026-06-03T12:00:00-03:00')

describe('effectiveOrderStatus', () => {
  it('laat een onbetaalde order voorbij de vervaldatum als Expired zien', () => {
    const status = effectiveOrderStatus(
      { orderStatus: 'PendingPayment', expiresAt: past },
      now,
    )
    expect(status).toBe('Expired')
  })

  it('laat een onbetaalde order binnen de termijn ongewijzigd', () => {
    const status = effectiveOrderStatus(
      { orderStatus: 'PendingPayment', expiresAt: future },
      now,
    )
    expect(status).toBe('PendingPayment')
  })

  it('laat een betaalde order nooit verlopen', () => {
    const status = effectiveOrderStatus(
      { orderStatus: 'Paid', expiresAt: past },
      now,
    )
    expect(status).toBe('Paid')
  })

  it('laat een order met ingediend betaalbewijs niet verlopen, ook niet na de oorspronkelijke deadline', () => {
    const status = effectiveOrderStatus(
      { orderStatus: 'AwaitingReview', expiresAt: past },
      now,
    )
    expect(status).toBe('AwaitingReview')
  })
})

describe('isReserving', () => {
  it('reserveert voor lopende en betaalde orders', () => {
    expect(
      isReserving({ orderStatus: 'PendingPayment', expiresAt: future }, now),
    ).toBe(true)
    expect(isReserving({ orderStatus: 'Paid', expiresAt: past }, now)).toBe(
      true,
    )
  })

  it('reserveert niet voor verlopen of geannuleerde orders', () => {
    expect(
      isReserving({ orderStatus: 'PendingPayment', expiresAt: past }, now),
    ).toBe(false)
    expect(
      isReserving({ orderStatus: 'Cancelled', expiresAt: future }, now),
    ).toBe(false)
  })

  it('blijft reserveren voor ingediend betaalbewijs voorbij de oorspronkelijke deadline', () => {
    expect(
      isReserving({ orderStatus: 'AwaitingReview', expiresAt: past }, now),
    ).toBe(true)
  })
})

/**
 * Zonder hersteltermijn zou een afgekeurde order in `AwaitingReview` blijven
 * hangen: die verloopt nooit en houdt zijn plaatsen dus voor altijd bezet,
 * ook als de klant nooit meer iets indient (BR-506/507).
 */
describe('deadlineAfterRejection', () => {
  it('geeft de klant 24 uur vanaf het moment van afkeuren', () => {
    expect(REJECTION_GRACE_MS).toBe(24 * 60 * 60 * 1000)
    expect(deadlineAfterRejection(now).getTime() - now.getTime()).toBe(
      REJECTION_GRACE_MS,
    )
  })

  it('laat de order daarna alsnog verlopen en zijn plaatsen vrijgeven', () => {
    const rejectedAt = past
    const order = {
      orderStatus: 'PendingPayment' as const,
      expiresAt: deadlineAfterRejection(rejectedAt),
    }

    // Binnen de hersteltermijn kan de klant opnieuw indienen.
    const binnen = new Date(rejectedAt.getTime() + 60 * 60 * 1000)
    expect(effectiveOrderStatus(order, binnen)).toBe('PendingPayment')
    expect(isReserving(order, binnen)).toBe(true)

    // Daarna verloopt hij en komen de plaatsen terug in de verkoop.
    expect(effectiveOrderStatus(order, now)).toBe('Expired')
    expect(isReserving(order, now)).toBe(false)
  })
})
