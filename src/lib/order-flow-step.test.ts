import { describe, expect, it } from 'vitest'

import { deriveOrderFlowStep } from '#/lib/order-flow-step.ts'

const expiresAt = new Date('2026-08-07T00:00:00Z')
const now = new Date('2026-08-05T00:00:00Z') // vóór expiresAt

describe('deriveOrderFlowStep', () => {
  it('PendingPayment → wacht-scherm, stap 1 actief', () => {
    expect(
      deriveOrderFlowStep({ orderStatus: 'PendingPayment', expiresAt }, now),
    ).toEqual({
      screen: 'wacht',
      activeStep: 1,
      status: 'PendingPayment',
      paymentRequestedAt: null,
    })
  })

  it('AwaitingReview → wacht-scherm, stap 2 actief', () => {
    expect(
      deriveOrderFlowStep({ orderStatus: 'AwaitingReview', expiresAt }, now),
    ).toEqual({
      screen: 'wacht',
      activeStep: 2,
      status: 'AwaitingReview',
      paymentRequestedAt: null,
    })
  })

  it('Paid → betaald-scherm, stap 3 (laatste) actief', () => {
    expect(
      deriveOrderFlowStep({ orderStatus: 'Paid', expiresAt }, now),
    ).toEqual({
      screen: 'betaald',
      activeStep: 3,
      status: 'Paid',
      paymentRequestedAt: null,
    })
  })

  it('Completed → betaald-scherm', () => {
    expect(
      deriveOrderFlowStep({ orderStatus: 'Completed', expiresAt }, now),
    ).toEqual({
      screen: 'betaald',
      activeStep: 3,
      status: 'Completed',
      paymentRequestedAt: null,
    })
  })

  it('Cancelled → verlopen-scherm', () => {
    expect(
      deriveOrderFlowStep({ orderStatus: 'Cancelled', expiresAt }, now),
    ).toEqual({
      screen: 'verlopen',
      activeStep: 0,
      status: 'Cancelled',
      paymentRequestedAt: null,
    })
  })

  it('een verstreken PendingPayment-order telt als verlopen (lazy expiry, BR-506/507)', () => {
    const now = new Date('2026-08-08T00:00:00Z') // na expiresAt
    expect(
      deriveOrderFlowStep({ orderStatus: 'PendingPayment', expiresAt }, now),
    ).toEqual({
      screen: 'verlopen',
      activeStep: 0,
      status: 'Expired',
      paymentRequestedAt: null,
    })
  })

  it('een reeds betaalde order blijft betaald, ook na expiresAt', () => {
    const now = new Date('2026-08-08T00:00:00Z')
    expect(
      deriveOrderFlowStep({ orderStatus: 'Completed', expiresAt }, now),
    ).toEqual({
      screen: 'betaald',
      activeStep: 3,
      status: 'Completed',
      paymentRequestedAt: null,
    })
  })

  it('geeft het tijdstip van het betaalverzoek door zodra het verstuurd is', () => {
    const requestedAt = new Date('2026-08-05T09:37:00Z')
    expect(
      deriveOrderFlowStep(
        {
          orderStatus: 'PendingPayment',
          expiresAt,
          paymentRequestedAt: requestedAt,
        },
        now,
      ),
    ).toEqual({
      screen: 'wacht',
      activeStep: 1,
      status: 'PendingPayment',
      paymentRequestedAt: requestedAt,
    })
  })
})
