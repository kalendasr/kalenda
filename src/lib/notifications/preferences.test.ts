import { describe, expect, it } from 'vitest'

import { resolveEnabled } from '#/lib/notifications/preferences.ts'

const toggleable = {
  key: 'order.created',
  toggleable: true,
  defaultEnabled: true,
}

const notToggleable = {
  key: 'tickets.issued',
  toggleable: false,
  defaultEnabled: true,
}

describe('resolveEnabled', () => {
  it('geen opgeslagen rij → de standaardwaarde', () => {
    expect(resolveEnabled(toggleable, [])).toBe(true)
    expect(resolveEnabled({ ...toggleable, defaultEnabled: false }, [])).toBe(
      false,
    )
  })

  it('opgeslagen rij wint van de standaard', () => {
    expect(
      resolveEnabled(toggleable, [{ type: 'order.created', enabled: false }]),
    ).toBe(false)
  })

  it('een rij voor een ander type wordt genegeerd', () => {
    expect(
      resolveEnabled(toggleable, [{ type: 'scan.unusual', enabled: false }]),
    ).toBe(true)
  })

  it('een niet-uitschakelbaar type staat altijd aan, ook met een uit-rij', () => {
    expect(
      resolveEnabled(notToggleable, [
        { type: 'tickets.issued', enabled: false },
      ]),
    ).toBe(true)
  })
})
