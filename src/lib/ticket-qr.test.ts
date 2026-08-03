import { describe, expect, it } from 'vitest'

import { parseTicketNumberFromQr, ticketQrPayload } from '#/lib/ticket-qr.ts'

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

describe('parseTicketNumberFromQr', () => {
  const nummer = '11111111-2222-3333-4444-555555555555'

  it('haalt het ticketnummer uit een resolvende URL', () => {
    expect(parseTicketNumberFromQr(`https://kalenda.sr/ticket/${nummer}`)).toBe(
      nummer,
    )
  })

  it('accepteert een kaal ticketnummer', () => {
    expect(parseTicketNumberFromQr(nummer)).toBe(nummer)
  })

  it('negeert witruimte rondom de payload', () => {
    expect(parseTicketNumberFromQr(`  ${nummer}  `)).toBe(nummer)
  })

  it('decodeert URL-gecodeerde karakters', () => {
    expect(parseTicketNumberFromQr('https://x.sr/ticket/a%2Fb')).toBe('a/b')
  })

  it('geeft null voor een lege of blanco payload', () => {
    expect(parseTicketNumberFromQr('')).toBeNull()
    expect(parseTicketNumberFromQr('   ')).toBeNull()
  })

  it('geeft null voor een onherkenbare URL met scheme', () => {
    expect(parseTicketNumberFromQr('https://ander.sr/event/foo')).toBeNull()
  })
})
