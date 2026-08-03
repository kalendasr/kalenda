import { describe, expect, it } from 'vitest'

import { generateTicketNumber } from '#/lib/ticket-number.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('generateTicketNumber', () => {
  it('geeft een UUID-vormig nummer terug', () => {
    expect(generateTicketNumber()).toMatch(UUID_RE)
  })

  it('geeft verschillende nummers voor opeenvolgende aanroepen', () => {
    const a = generateTicketNumber()
    const b = generateTicketNumber()
    expect(a).not.toBe(b)
  })
})
