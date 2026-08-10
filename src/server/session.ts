import { createServerFn } from '@tanstack/react-start'

import { getSession } from '#/lib/session.server.ts'
import type { SessionUser } from '#/lib/session.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'

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
    // additionalFields: better-auth geeft ze mee via de server-config, maar
    // het type van getSession() kent ze niet automatisch — vandaar de cast.
    const u = session.user as typeof session.user & {
      firstName: string
      lastName: string
      phone?: string | null
    }
    return {
      id,
      name,
      email,
      image: image ?? null,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone ?? null,
    }
  },
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
