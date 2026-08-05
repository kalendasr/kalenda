import { describe, expect, it } from 'vitest'

import {
  centsToInput,
  formatMoney,
  formatSrd,
  formatEur,
  parsePriceToCents,
} from '#/lib/money.ts'

describe('formatSrd', () => {
  it('formatteert centen als SRD met twee decimalen', () => {
    expect(formatSrd(5000)).toBe('SRD 50,00')
    expect(formatSrd(0)).toBe('SRD 0,00')
    expect(formatSrd(12345)).toBe('SRD 123,45')
  })
})

describe('parsePriceToCents', () => {
  it('accepteert hele bedragen', () => {
    expect(parsePriceToCents('50')).toBe(5000)
  })

  it('accepteert komma en punt als decimaalteken', () => {
    expect(parsePriceToCents('50,00')).toBe(5000)
    expect(parsePriceToCents('50.5')).toBe(5050)
  })

  it('accepteert nul (gratis)', () => {
    expect(parsePriceToCents('0')).toBe(0)
  })

  it('wijst ongeldige en negatieve invoer af', () => {
    expect(parsePriceToCents('')).toBeNull()
    expect(parsePriceToCents('gratis')).toBeNull()
    expect(parsePriceToCents('-5')).toBeNull()
    expect(parsePriceToCents('5,999')).toBeNull()
  })
})

describe('centsToInput', () => {
  it('is de tegenhanger voor het prijsinvoerveld', () => {
    expect(centsToInput(5000)).toBe('50,00')
    expect(parsePriceToCents(centsToInput(12345))).toBe(12345)
  })
})

describe('formatEur', () => {
  it('formatteert centen (SRD) als indicatief EUR-bedrag', () => {
    expect(formatEur(4000)).toBe('€ 1,00')
    expect(formatEur(0)).toBe('€ 0,00')
  })
})

describe('formatMoney', () => {
  it('kiest de opgegeven weergavevaluta, standaard SRD', () => {
    expect(formatMoney(5000)).toBe(formatSrd(5000))
    expect(formatMoney(5000, 'SRD')).toBe(formatSrd(5000))
    expect(formatMoney(5000, 'EUR')).toBe(formatEur(5000))
  })
})
