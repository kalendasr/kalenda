import { describe, expect, it } from 'vitest'

import { describeDevice } from '#/lib/notifications/device.ts'

describe('describeDevice', () => {
  it('herkent Chrome op Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
    expect(describeDevice(ua)).toBe('Chrome op Android')
  })

  it('herkent Safari op iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    expect(describeDevice(ua)).toBe('Safari op iPhone')
  })

  it('herkent Firefox op de desktop', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    expect(describeDevice(ua)).toBe('Firefox op Windows')
  })

  it('valt terug op "Onbekend apparaat" zonder user-agent', () => {
    expect(describeDevice(null)).toBe('Onbekend apparaat')
    expect(describeDevice('')).toBe('Onbekend apparaat')
  })
})
