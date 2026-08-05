import { describe, expect, it } from 'vitest'

import {
  dateToSurinameLocal,
  elapsedPercentage,
  formatRemaining,
  isSurinameToday,
  isSurinameWeekend,
  surinameLocalToDate,
  surinameWeekday,
} from '#/lib/datetime.ts'

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

describe('isSurinameToday', () => {
  it('is waar voor hetzelfde kalenderdag in Suriname-tijd', () => {
    const now = new Date('2026-08-05T15:00:00-03:00') // woensdag, middag
    expect(isSurinameToday(new Date('2026-08-05T23:00:00-03:00'), now)).toBe(
      true,
    )
  })

  it('is onwaar voor een andere dag', () => {
    const now = new Date('2026-08-05T15:00:00-03:00')
    expect(isSurinameToday(new Date('2026-08-06T01:00:00-03:00'), now)).toBe(
      false,
    )
  })
})

describe('isSurinameWeekend', () => {
  it('herkent het eerstvolgende weekend vanaf een doordeweekse dag', () => {
    const now = new Date('2026-08-05T15:00:00-03:00') // woensdag
    expect(isSurinameWeekend(new Date('2026-08-07T20:00:00-03:00'), now)).toBe(
      true,
    ) // vrijdagavond
    expect(isSurinameWeekend(new Date('2026-08-09T12:00:00-03:00'), now)).toBe(
      true,
    ) // zondagmiddag
    expect(isSurinameWeekend(new Date('2026-08-05T20:00:00-03:00'), now)).toBe(
      false,
    ) // dezelfde woensdag
    expect(isSurinameWeekend(new Date('2026-08-10T09:00:00-03:00'), now)).toBe(
      false,
    ) // de maandag erna
  })

  it('telt het lopende weekend mee als now al in het weekend valt', () => {
    const now = new Date('2026-08-08T10:00:00-03:00') // zaterdag
    expect(isSurinameWeekend(new Date('2026-08-08T22:00:00-03:00'), now)).toBe(
      true,
    )
  })
})

describe('surinameWeekday', () => {
  it('geeft 0=zondag .. 6=zaterdag in Suriname-tijd', () => {
    expect(surinameWeekday(new Date('2026-08-05T15:00:00-03:00'))).toBe(3) // woensdag
    expect(surinameWeekday(new Date('2026-08-09T15:00:00-03:00'))).toBe(0) // zondag
  })
})

describe('formatRemaining', () => {
  it('formatteert de resterende tijd in uren en minuten', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const expiresAt = new Date('2026-08-06T23:52:00Z')
    expect(formatRemaining(expiresAt, now)).toBe('47 uur 52 min')
  })

  it('geeft "Verlopen" zodra het moment is gepasseerd', () => {
    const now = new Date('2026-08-06T00:00:00Z')
    expect(formatRemaining(new Date('2026-08-05T23:59:00Z'), now)).toBe(
      'Verlopen',
    )
    expect(formatRemaining(now, now)).toBe('Verlopen')
  })
})

describe('elapsedPercentage', () => {
  it('berekent het verstreken deel van het venster', () => {
    const createdAt = new Date('2026-08-05T00:00:00Z')
    const expiresAt = new Date('2026-08-07T00:00:00Z') // 48 uur venster
    const now = new Date('2026-08-06T00:00:00Z') // 24 uur verstreken
    expect(elapsedPercentage(createdAt, expiresAt, now)).toBe(50)
  })

  it('klemt op 100 zodra de order al verlopen is', () => {
    const createdAt = new Date('2026-08-05T00:00:00Z')
    const expiresAt = new Date('2026-08-07T00:00:00Z')
    const now = new Date('2026-08-08T00:00:00Z')
    expect(elapsedPercentage(createdAt, expiresAt, now)).toBe(100)
  })

  it('klemt op 0 als now vóór createdAt ligt', () => {
    const createdAt = new Date('2026-08-05T00:00:00Z')
    const expiresAt = new Date('2026-08-07T00:00:00Z')
    const now = new Date('2026-08-04T00:00:00Z')
    expect(elapsedPercentage(createdAt, expiresAt, now)).toBe(0)
  })
})
