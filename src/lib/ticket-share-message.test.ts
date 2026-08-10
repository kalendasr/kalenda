import { describe, expect, it } from 'vitest'

import { buildTicketShareMessage } from '#/lib/ticket-share-message.ts'

describe('buildTicketShareMessage', () => {
  it('bevat de voornaam, het event en de orderlink', () => {
    const message = buildTicketShareMessage({
      customerFirstName: 'Amresh',
      eventTitle: 'Global AI & Big Data Expo 2026',
      orderUrl: 'https://kalenda.sr/bestelling/KAL-8PTYDGGK',
    })

    expect(message).toContain('Amresh')
    expect(message).toContain('Global AI & Big Data Expo 2026')
    expect(message).toContain('https://kalenda.sr/bestelling/KAL-8PTYDGGK')
  })
})
