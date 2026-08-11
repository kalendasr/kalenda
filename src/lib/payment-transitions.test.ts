import { describe, expect, it } from 'vitest'

import type { PaymentAction } from '#/lib/payment-transitions.ts'
import {
  canTransition,
  nextState,
  PAYMENT_STATE_LABELS,
  paymentStateBadgeVariant,
} from '#/lib/payment-transitions.ts'

describe('nextState', () => {
  it('laat bankflow: Waiting → Submitted → Verified toe', () => {
    expect(nextState('Waiting', 'submit')).toBe('Submitted')
    expect(nextState('Submitted', 'approve')).toBe('Verified')
  })

  it('laat WhatsApp-flow: Waiting → Verified toe (organisator bevestigt)', () => {
    expect(nextState('Waiting', 'approve')).toBe('Verified')
  })

  it('laat het betaalverzoek versturen toe: Waiting → Requested', () => {
    expect(nextState('Waiting', 'request')).toBe('Requested')
  })

  it('laat Requested → Verified/Rejected toe, maar niet opnieuw request', () => {
    expect(nextState('Requested', 'approve')).toBe('Verified')
    expect(nextState('Requested', 'reject')).toBe('Rejected')
    expect(nextState('Requested', 'request')).toBeNull()
  })

  it('strookt afkeuring: Waiting/Submitted → Rejected', () => {
    expect(nextState('Waiting', 'reject')).toBe('Rejected')
    expect(nextState('Submitted', 'reject')).toBe('Rejected')
  })

  it('laat herindienen na afkeuring toe (BR-605): Rejected → Submitted', () => {
    expect(nextState('Rejected', 'submit')).toBe('Submitted')
  })

  // In de WhatsApp-flow kan de klant na een afkeuring niets zelf doen: er is
  // geen bewijs om in te dienen. Zonder deze twee uitwegen zou zo'n bestelling
  // voor iedereen vastlopen.
  it('laat de organisator na afkeuring opnieuw een betaalverzoek sturen', () => {
    expect(nextState('Rejected', 'request')).toBe('Requested')
  })

  it('laat de organisator een afgekeurde betaling alsnog bevestigen (BR-607)', () => {
    expect(nextState('Rejected', 'approve')).toBe('Verified')
  })

  it('laat een bestelling met ingediend bewijs annuleren', () => {
    expect(nextState('Submitted', 'cancel')).toBe('Cancelled')
  })

  it('blokkeert illegale overgangen', () => {
    expect(nextState('Verified', 'submit')).toBeNull()
    expect(nextState('Verified', 'reject')).toBeNull()
    expect(nextState('Verified', 'cancel')).toBeNull()
    expect(nextState('Cancelled', 'submit')).toBeNull()
    expect(nextState('Waiting', 'something' as PaymentAction)).toBeNull()
  })
})

describe('canTransition', () => {
  it('keurt geldige doeltoestanden goed', () => {
    expect(canTransition('Waiting', 'Submitted')).toBe(true)
    expect(canTransition('Submitted', 'Rejected')).toBe(true)
    expect(canTransition('Rejected', 'Submitted')).toBe(true)
  })

  it('weigert ongeldige doeltoestanden', () => {
    expect(canTransition('Verified', 'Waiting')).toBe(false)
    expect(canTransition('Waiting', 'Verified')).toBe(true)
  })
})

describe('labels & badges', () => {
  it('geeft een menselijk label voor elke toestand', () => {
    expect(PAYMENT_STATE_LABELS.Verified).toBe('Betaald')
    expect(PAYMENT_STATE_LABELS.Submitted).toBe('Bewijs ontvangen')
  })

  it('gebruikt groen voor Verified en rood voor Rejected', () => {
    expect(paymentStateBadgeVariant('Verified')).toBe('soft-success')
    expect(paymentStateBadgeVariant('Rejected')).toBe('soft-destructive')
    expect(paymentStateBadgeVariant('Waiting')).toBe('soft-muted')
  })
})
