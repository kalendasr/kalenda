import { createServerFn } from '@tanstack/react-start'

import { getSession } from '#/lib/session.server.ts'
import type { SessionUser } from '#/lib/session.server.ts'

/**
 * Server function voor route-guards (`beforeLoad`). De handler-code draait op de
 * server; de server-only imports worden uit de client-bundle gestript. Routes
 * importeren daarom deze module, niet `session.server.ts` rechtstreeks.
 */
export const fetchSessionUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const session = await getSession()
    if (!session?.user) return null

    const { id, name, email, image } = session.user
    return { id, name, email, image: image ?? null }
  },
)
