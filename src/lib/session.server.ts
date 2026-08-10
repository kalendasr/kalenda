import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth.server.ts'

/**
 * Sessiehulpen voor de serverkant.
 *
 * Better Auth leest de sessie uit de request-cookies. `getRequest()` geeft
 * binnen een server function of route-loader de actuele request.
 *
 * Dit is een server-only module (`.server.ts`): importeer hem nooit direct in
 * een route. Route-guards gebruiken de server function in `src/server/session.ts`.
 */

export async function getSession() {
  return auth.api.getSession({ headers: getRequest().headers })
}

/** Beknopte sessiegebruiker voor route-guards (`beforeLoad`), of `null`. */
export type SessionUser = {
  id: string
  name: string
  email: string
  image: string | null
  firstName: string
  lastName: string
  phone: string | null
}

/**
 * Vereist een ingelogde gebruiker. Gooit een fout wanneer er geen sessie is,
 * zodat aanroepers nooit per ongeluk zonder gebruiker verder werken.
 * (Security: gebruikers zien uitsluitend hun eigen gegevens — BR §13.)
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('UNAUTHENTICATED')
  }

  const { id, name, email, image } = session.user
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
}
