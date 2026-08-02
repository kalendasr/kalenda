import { describe, expect, it } from 'vitest'

import { effectiveOrderStatus, isReserving } from '#/lib/order-status.ts'

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
})
