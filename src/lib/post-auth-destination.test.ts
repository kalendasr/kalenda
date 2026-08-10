import { describe, expect, it } from 'vitest'

import { postAuthDestination } from '#/lib/post-auth-destination.ts'

describe('postAuthDestination', () => {
  it('geeft voorrang aan een aanwezige redirect, ongeacht organisatie', () => {
    expect(
      postAuthDestination({
        redirectTo: '/evenementen/foo/afrekenen',
        hasOrganization: true,
      }),
    ).toBe('/evenementen/foo/afrekenen')
  })

  it('stuurt een organisator zonder redirect naar het dashboard', () => {
    expect(
      postAuthDestination({ redirectTo: null, hasOrganization: true }),
    ).toBe('/dashboard')
  })

  it('stuurt een koper zonder redirect naar de storefront', () => {
    expect(
      postAuthDestination({ redirectTo: null, hasOrganization: false }),
    ).toBe('/evenementen')
  })
})
