import { beforeAll, describe, expect, it, vi } from 'vitest'

import { getPublicUrl } from '#/lib/storage.server.ts'

describe('getPublicUrl', () => {
  beforeAll(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'account')
    vi.stubEnv('R2_ACCESS_KEY_ID', 'key')
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret')
    vi.stubEnv('R2_BUCKET', 'kalenda-test')
    vi.stubEnv('R2_PUBLIC_URL', 'https://cdn.example.com/')
  })

  it('bouwt een publieke URL zonder dubbele slash', () => {
    expect(getPublicUrl('events/cover.jpg')).toBe(
      'https://cdn.example.com/events/cover.jpg',
    )
  })
})
