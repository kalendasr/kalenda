import { describe, expect, it } from 'vitest'

import { cn } from '#/lib/utils.ts'

describe('cn', () => {
  it('voegt klassen samen', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('laat de laatste conflicterende Tailwind-klasse winnen', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('negeert falsy waarden', () => {
    expect(cn('px-4', false, undefined, null, 'py-2')).toBe('px-4 py-2')
  })
})
