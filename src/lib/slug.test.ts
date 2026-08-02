import { describe, expect, it } from 'vitest'

import { makeUniqueSlug, slugify } from '#/lib/slug.ts'

describe('slugify', () => {
  it('maakt kleine letters met koppeltekens', () => {
    expect(slugify('Ravi Events')).toBe('ravi-events')
  })

  it('verwijdert diakritische tekens', () => {
    expect(slugify('Café Sürináme')).toBe('cafe-suriname')
  })

  it('haalt leestekens en dubbele scheidingstekens weg', () => {
    expect(slugify('  Feest!! 2026 @ Paramaribo  ')).toBe(
      'feest-2026-paramaribo',
    )
  })

  it('geeft een lege string voor invoer zonder letters of cijfers', () => {
    expect(slugify('***')).toBe('')
  })
})

describe('makeUniqueSlug', () => {
  it('gebruikt de basis wanneer die vrij is', () => {
    expect(makeUniqueSlug('Ravi Events', () => false)).toBe('ravi-events')
  })

  it('telt op tot de eerste vrije variant', () => {
    const taken = new Set(['ravi-events', 'ravi-events-2'])
    expect(makeUniqueSlug('Ravi Events', (c) => taken.has(c))).toBe(
      'ravi-events-3',
    )
  })

  it('valt terug op "organisatie" wanneer de naam geen slug oplevert', () => {
    expect(makeUniqueSlug('***', () => false)).toBe('organisatie')
  })
})
