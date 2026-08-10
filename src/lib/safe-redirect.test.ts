import { describe, expect, it } from 'vitest'

import { safeRedirect } from '#/lib/safe-redirect.ts'

describe('safeRedirect', () => {
  it('staat een pad binnen de site toe', () => {
    expect(safeRedirect('/evenementen')).toBe('/evenementen')
  })

  it('weert een protocol-relatieve URL', () => {
    expect(safeRedirect('//evil.com')).toBeNull()
  })

  it('weert een backslash-pad', () => {
    expect(safeRedirect('/\\evil')).toBeNull()
  })

  it('weert een absolute externe URL', () => {
    expect(safeRedirect('https://evil.com')).toBeNull()
  })

  it('weert een leeg of ontbrekend pad', () => {
    expect(safeRedirect('')).toBeNull()
    expect(safeRedirect(undefined)).toBeNull()
  })
})
