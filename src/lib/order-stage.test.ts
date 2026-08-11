import { describe, expect, it } from 'vitest'

import { deriveOrderStage, ORDER_STAGE_LABELS } from '#/lib/order-stage.ts'
import type { OrderStageInput } from '#/lib/order-stage.ts'

const now = new Date('2026-06-01T12:00:00-03:00')
const future = new Date('2026-06-03T12:00:00-03:00')
const past = new Date('2026-05-30T12:00:00-03:00')

function base(overrides: Partial<OrderStageInput>): OrderStageInput {
  return {
    orderStatus: 'PendingPayment',
    expiresAt: future,
    paymentMethod: 'WhatsApp',
    payment: { state: 'Waiting' },
    ticketsSent: false,
    ...overrides,
  }
}

describe('deriveOrderStage — WhatsApp-flow', () => {
  it('is NewOrder zolang er nog geen betaalverzoek is verstuurd', () => {
    expect(deriveOrderStage(base({}), now)).toBe('NewOrder')
  })

  it('wordt PaymentRequested zodra het betaalverzoek is verstuurd', () => {
    expect(
      deriveOrderStage(base({ payment: { state: 'Requested' } }), now),
    ).toBe('PaymentRequested')
  })

  it('wordt TicketsPending zodra betaald maar de mail nog niet verstuurd is', () => {
    expect(
      deriveOrderStage(
        base({
          orderStatus: 'Paid',
          payment: { state: 'Verified' },
          ticketsSent: false,
        }),
        now,
      ),
    ).toBe('TicketsPending')
  })

  it('wordt Done zodra de tickets verstuurd zijn', () => {
    expect(
      deriveOrderStage(
        base({
          orderStatus: 'Completed',
          payment: { state: 'Verified' },
          ticketsSent: true,
        }),
        now,
      ),
    ).toBe('Done')
  })
})

describe('deriveOrderStage — bankflow', () => {
  it('is AwaitingTransfer zolang er geen bewijs is ingediend', () => {
    expect(
      deriveOrderStage(
        base({ paymentMethod: 'BankTransfer', payment: { state: 'Waiting' } }),
        now,
      ),
    ).toBe('AwaitingTransfer')
  })

  it('wordt ProofSubmitted na het uploaden van een bewijs', () => {
    expect(
      deriveOrderStage(
        base({
          paymentMethod: 'BankTransfer',
          orderStatus: 'AwaitingReview',
          payment: { state: 'Submitted' },
        }),
        now,
      ),
    ).toBe('ProofSubmitted')
  })

  // Na afkeuring gaat de order terug naar PendingPayment met een hersteltermijn
  // (zie deadlineAfterRejection), zodat hij alsnog kan verlopen. De klant moet
  // dan nog steeds lezen dát er iets is afgekeurd, niet een neutrale
  // "wacht op overschrijving".
  it('wordt ProofRejected na afkeuring, terwijl de order weer op PendingPayment staat', () => {
    expect(
      deriveOrderStage(
        base({
          paymentMethod: 'BankTransfer',
          orderStatus: 'PendingPayment',
          payment: { state: 'Rejected' },
        }),
        now,
      ),
    ).toBe('ProofRejected')
  })

  it('wordt Expired zodra ook de hersteltermijn na afkeuring voorbij is', () => {
    expect(
      deriveOrderStage(
        base({
          paymentMethod: 'BankTransfer',
          orderStatus: 'PendingPayment',
          payment: { state: 'Rejected' },
          expiresAt: past,
        }),
        now,
      ),
    ).toBe('Expired')
  })
})

describe('deriveOrderStage — verlopen en geannuleerd', () => {
  it('laat een verlopen betaaltermijn boven alles winnen', () => {
    expect(
      deriveOrderStage(
        base({ expiresAt: past, payment: { state: 'Requested' } }),
        now,
      ),
    ).toBe('Expired')
  })

  it('laat ProofSubmitted niet verlopen na de oorspronkelijke betaaltermijn', () => {
    expect(
      deriveOrderStage(
        base({
          orderStatus: 'AwaitingReview',
          expiresAt: past,
          payment: { state: 'Submitted' },
        }),
        now,
      ),
    ).toBe('ProofSubmitted')
  })

  it('herkent een geannuleerde order', () => {
    expect(deriveOrderStage(base({ orderStatus: 'Cancelled' }), now)).toBe(
      'Cancelled',
    )
  })
})

describe('ORDER_STAGE_LABELS', () => {
  it('heeft voor elke fase een uniek, menselijk label', () => {
    const labels = Object.values(ORDER_STAGE_LABELS)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
