import { describe, expect, it } from 'vitest'

import { registerSchema, resetPasswordSchema } from '#/lib/validation/auth.ts'
import { organizationGeneralSchema } from '#/lib/validation/organization.ts'
import { paymentSettingsSchema } from '#/lib/validation/payment.ts'

describe('registerSchema', () => {
  const valid = {
    firstName: 'Ravi',
    lastName: 'Tewari',
    email: 'ravi@example.com',
    password: 'supersecret123',
  }

  it('accepteert geldige invoer', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('vereist een geldig e-mailadres', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'geen-email' })
    expect(result.success).toBe(false)
  })

  it('eist minimaal 12 tekens voor het wachtwoord', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'kort' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('faalt wanneer de wachtwoorden niet overeenkomen', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'supersecret123',
      confirmPassword: 'andersanders12',
    })
    expect(result.success).toBe(false)
  })
})

describe('organizationGeneralSchema', () => {
  it('normaliseert lege optionele velden naar undefined', () => {
    const result = organizationGeneralSchema.parse({
      name: 'Ravi Events',
      description: '',
      website: '',
      country: 'Suriname',
    })
    expect(result.description).toBeUndefined()
    expect(result.website).toBeUndefined()
  })

  it('wijst een ongeldige website af', () => {
    const result = organizationGeneralSchema.safeParse({
      name: 'Ravi Events',
      website: 'geen-url',
      country: 'Suriname',
    })
    expect(result.success).toBe(false)
  })
})

describe('paymentSettingsSchema', () => {
  const base = {
    whatsappEnabled: false,
    whatsappApps: [],
    bankEnabled: false,
  }

  it('accepteert WhatsApp met nummer en minimaal één app', () => {
    const result = paymentSettingsSchema.safeParse({
      ...base,
      whatsappEnabled: true,
      whatsappPhone: '+597 8881234',
      whatsappApps: ['Mope'],
    })
    expect(result.success).toBe(true)
  })

  it('eist een app wanneer WhatsApp is ingeschakeld', () => {
    const result = paymentSettingsSchema.safeParse({
      ...base,
      whatsappEnabled: true,
      whatsappPhone: '+597 8881234',
      whatsappApps: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepteert alleen bekende betaalapps', () => {
    const result = paymentSettingsSchema.safeParse({
      ...base,
      whatsappEnabled: true,
      whatsappPhone: '+597 8881234',
      whatsappApps: ['Bitcoin'],
    })
    expect(result.success).toBe(false)
  })

  it('eist bankgegevens wanneer bankoverschrijving is ingeschakeld', () => {
    const result = paymentSettingsSchema.safeParse({
      ...base,
      bankEnabled: true,
    })
    expect(result.success).toBe(false)
  })
})
