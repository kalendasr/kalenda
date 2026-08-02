import { describe, expect, it } from 'vitest'

import { dateToSurinameLocal, surinameLocalToDate } from '#/lib/datetime.ts'

describe('surinameLocalToDate', () => {
  it('interpreteert de invoer als Suriname-tijd (UTC-3)', () => {
    const date = surinameLocalToDate('2026-09-01T20:00')
    // 20:00 in Suriname (UTC-3) is 23:00 UTC.
    expect(date?.toISOString()).toBe('2026-09-01T23:00:00.000Z')
  })

  it('geeft null voor lege invoer', () => {
    expect(surinameLocalToDate('')).toBeNull()
    expect(surinameLocalToDate(null)).toBeNull()
  })
})

describe('dateToSurinameLocal', () => {
  it('formatteert een Date terug naar Suriname-wandtijd', () => {
    const date = new Date('2026-09-01T23:00:00.000Z')
    expect(dateToSurinameLocal(date)).toBe('2026-09-01T20:00')
  })

  it('is de inverse van surinameLocalToDate', () => {
    const local = '2026-12-31T23:30'
    const roundTrip = dateToSurinameLocal(surinameLocalToDate(local))
    expect(roundTrip).toBe(local)
  })

  it('geeft een lege string voor null', () => {
    expect(dateToSurinameLocal(null)).toBe('')
  })
})
