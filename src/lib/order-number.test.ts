import { describe, expect, it } from 'vitest'

import { generateOrderNumber, isValidOrderNumber } from '#/lib/order-number.ts'

describe('generateOrderNumber', () => {
  it('heeft het formaat KAL-XXXXXXXX', () => {
    expect(generateOrderNumber()).toMatch(/^KAL-[A-Z2-9]{8}$/)
  })

  it('gebruikt geen verwarrende tekens (0, O, 1, I)', () => {
    const codes = Array.from({ length: 50 }, () => generateOrderNumber())
    for (const code of codes) {
      expect(code.slice(4)).not.toMatch(/[01OI]/)
    }
  })

  it('is in de praktijk uniek over veel trekkingen', () => {
    const set = new Set(
      Array.from({ length: 500 }, () => generateOrderNumber()),
    )
    expect(set.size).toBe(500)
  })
})

describe('isValidOrderNumber', () => {
  it('accepteert een gegenereerd nummer en wijst rommel af', () => {
    expect(isValidOrderNumber(generateOrderNumber())).toBe(true)
    expect(isValidOrderNumber('KAL-0000')).toBe(false)
    expect(isValidOrderNumber('12345678')).toBe(false)
  })
})
