import { describe, expect, it } from 'vitest'

import { decodeSelection, encodeSelection } from '#/lib/selection.ts'

describe('selection encode/decode', () => {
  it('codeert alleen positieve aantallen', () => {
    const encoded = encodeSelection([
      { ticketTypeId: 'a', quantity: 2 },
      { ticketTypeId: 'b', quantity: 0 },
    ])
    expect(encoded).toBe('a:2')
  })

  it('is de tegenhanger van decode', () => {
    const items = [
      { ticketTypeId: 'a', quantity: 2 },
      { ticketTypeId: 'b', quantity: 1 },
    ]
    expect(decodeSelection(encodeSelection(items))).toEqual(items)
  })

  it('negeert ongeldige of lege delen', () => {
    expect(decodeSelection('a:2,b:0,c:x,:3,d')).toEqual([
      { ticketTypeId: 'a', quantity: 2 },
    ])
    expect(decodeSelection(undefined)).toEqual([])
  })
})
