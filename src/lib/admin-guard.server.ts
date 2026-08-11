import { requireUser } from '#/lib/session.server.ts'
import type { SessionUser } from '#/lib/session.server.ts'

/**
 * Vereist een ingelogde platformbeheerder (Fase 11). Server-only: uitsluitend
 * binnen server-function handlers van `server/admin.ts` gebruiken.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser()

  if (!user.isPlatformAdmin) {
    throw new Error('FORBIDDEN')
  }

  return user
}
