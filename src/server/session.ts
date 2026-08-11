import { createServerFn } from '@tanstack/react-start'

import { getActiveUser } from '#/lib/session.server.ts'
import type { SessionUser } from '#/lib/session.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'

/**
 * Server function voor route-guards (`beforeLoad`). De handler-code draait op de
 * server; de server-only imports worden uit de client-bundle gestript. Routes
 * importeren daarom deze module, niet `session.server.ts` rechtstreeks.
 */
export const fetchSessionUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => getActiveUser(),
)

/** Of "Doorgaan met Google" getoond mag worden (afhankelijk van env-config). */
export const fetchAuthProviders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ googleEnabled: boolean }> => {
    const env = getServerEnv()
    return {
      googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    }
  },
)
