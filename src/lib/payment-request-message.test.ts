import { describe, expect, it } from 'vitest'

import { buildPaymentRequestMessage } from '#/lib/payment-request-message.ts'

describe('buildPaymentRequestMessage', () => {
  it('bevat naam, bedrag, ordernummer, app en vervaldatum', () => {
    const message = buildPaymentRequestMessage({
      customerFirstName: 'Amresh',
      eventTitle: 'Global AI & Big Data Expo 2026',
      orderNumber: 'KAL-8PTYDGGK',
      totalCents: 130000,
      paymentApp: 'Mope',
      orderUrl: 'https://kalenda.sr/bestelling/KAL-8PTYDGGK',
      expiresAt: new Date('2026-08-08T09:37:00-03:00'),
    })

    expect(message).toContain('Amresh')
    expect(message).toContain('KAL-8PTYDGGK')
    expect(message).toContain('SRD 1.300,00')
    expect(message).toContain('Mopé')
    expect(message).toContain('https://kalenda.sr/bestelling/KAL-8PTYDGGK')
  })

  it('valt terug op algemene tekst zonder gekozen betaalapp', () => {
    const message = buildPaymentRequestMessage({
      customerFirstName: 'Devika',
      eventTitle: 'Test Event',
      orderNumber: 'KAL-XXXX',
      totalCents: 5000,
      paymentApp: null,
      orderUrl: 'https://kalenda.sr/bestelling/KAL-XXXX',
      expiresAt: new Date('2026-08-08T09:37:00-03:00'),
    })

    expect(message).toContain('Je ontvangt zo een betaalverzoek.')
  })
})
