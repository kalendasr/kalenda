import { describe, expect, it } from 'vitest'

import {
  eventReminderKey,
  lowStockKey,
  orderReminderKey,
  soldOutKey,
} from '#/lib/notifications/claim-key.ts'

// De exacte strings zijn vastgepind: een wijziging zou stilletjes alle eerder
// verstuurde meldingen opnieuw als "nog niet verstuurd" laten gelden.
describe('claim-keys', () => {
  it('zijn deterministisch en stabiel', () => {
    expect(eventReminderKey('abc')).toBe('event:abc')
    expect(orderReminderKey('abc')).toBe('order:abc')
    expect(lowStockKey('abc')).toBe('ticket-type:abc:low')
    expect(soldOutKey('abc')).toBe('ticket-type:abc:soldout')
  })

  it('low en soldout verschillen voor hetzelfde tickettype', () => {
    expect(lowStockKey('t1')).not.toBe(soldOutKey('t1'))
  })
})
