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

  it('strookt afkeuring: Waiting/Submitted → Rejected', () => {
    expect(nextState('Waiting', 'reject')).toBe('Rejected')
    expect(nextState('Submitted', 'reject')).toBe('Rejected')
  })

  it('laat herindienen na afkeuring toe (BR-605): Rejected → Submitted', () => {
    expect(nextState('Rejected', 'submit')).toBe('Submitted')
  })

  it('blokkeert illegale overgangen', () => {
    expect(nextState('Verified', 'submit')).toBeNull()
    expect(nextState('Verified', 'reject')).toBeNull()
    expect(nextState('Waiting', 'something' as PaymentAction)).toBeNull()
    expect(nextState('Rejected', 'approve')).toBeNull()
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
    expect(paymentStateBadgeVariant('Verified')).toBe('secondary')
    expect(paymentStateBadgeVariant('Rejected')).toBe('destructive')
    expect(paymentStateBadgeVariant('Waiting')).toBe('outline')
  })
})
