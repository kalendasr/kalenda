import { describe, expect, it } from 'vitest'

import { truncate } from '#/lib/notifications/truncate.ts'

describe('truncate', () => {
  it('laat korte tekst ongemoeid', () => {
    expect(truncate('kort', 10)).toBe('kort')
  })

  it('laat tekst op de exacte lengte ongemoeid', () => {
    expect(truncate('twaalf-lang!', 12)).toBe('twaalf-lang!')
  })

  it('kort langere tekst in met één beletselteken', () => {
    const out = truncate('dit is een veel te lange titel', 12)
    expect(out.length).toBeLessThanOrEqual(12)
    expect(out.endsWith('…')).toBe(true)
    expect(out.endsWith('……')).toBe(false)
  })

  it('trimt omringende spaties', () => {
    expect(truncate('  hoi  ', 10)).toBe('hoi')
  })

  it('werkt met een lege string', () => {
    expect(truncate('', 5)).toBe('')
  })
})
