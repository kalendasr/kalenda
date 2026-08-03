import { describe, expect, it } from 'vitest'

import { ticketQrPayload } from '#/lib/ticket-qr.ts'

describe('ticketQrPayload', () => {
  it('bouwt een resolvende /ticket/:numero-URL op', () => {
    expect(ticketQrPayload('abc-123', 'https://kalenda.sr')).toBe(
      'https://kalenda.sr/ticket/abc-123',
    )
  })

  it('stript een afsluitende slash van de base-URL', () => {
    expect(ticketQrPayload('abc', 'https://kalenda.sr/')).toBe(
      'https://kalenda.sr/ticket/abc',
    )
  })
})
