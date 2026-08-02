import { describe, expect, it } from 'vitest'

import { checkoutSchema } from '#/lib/validation/checkout.ts'

const base = {
  firstName: 'Radj',
  lastName: 'Persad',
  email: 'radj@example.com',
  phone: '+597 8881234',
  paymentMethod: 'WhatsApp' as const,
  paymentApp: 'Mope' as const,
  items: [{ ticketTypeId: crypto.randomUUID(), quantity: 2 }],
}

describe('checkoutSchema', () => {
  it('accepteert een geldige WhatsApp-bestelling', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true)
  })

  it('vereist een geldig e-mailadres (BR-401)', () => {
    expect(checkoutSchema.safeParse({ ...base, email: 'geen' }).success).toBe(
      false,
    )
  })

  it('vereist een telefoonnummer (BR-402)', () => {
    expect(checkoutSchema.safeParse({ ...base, phone: '' }).success).toBe(false)
  })

  it('eist een betaalapp bij WhatsApp (BR-602)', () => {
    const { paymentApp: _omit, ...withoutApp } = base
    expect(checkoutSchema.safeParse(withoutApp).success).toBe(false)
  })

  it('staat bankoverschrijving zonder app toe', () => {
    const { paymentApp: _omit, ...rest } = base
    const result = checkoutSchema.safeParse({
      ...rest,
      paymentMethod: 'BankTransfer',
    })
    expect(result.success).toBe(true)
  })

  it('eist minimaal één ticket (BR-503)', () => {
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false)
  })
})
