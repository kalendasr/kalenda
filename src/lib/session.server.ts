import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth.server.ts'
import { db } from '#/lib/db.server.ts'

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
  isPlatformAdmin: boolean
}

/**
 * Sessiegebruiker inclusief blokkade-check, of `null` zonder geldige sessie.
 * Eén bron van waarheid voor `requireUser`, `fetchSessionUser` en
 * `loadAppContext`, die hiervoor eerst ieder hun eigen sessiemapping hadden.
 *
 * Better Auth kent `isPlatformAdmin`/`blockedAt` niet (geen additionalFields,
 * bewust — dit zijn geen door de gebruiker bewerkbare velden), dus die worden
 * hier los uit de database gehaald. Een geblokkeerde gebruiker wordt
 * behandeld als niet ingelogd: geen foutmelding die een sessie lekt, gewoon
 * `null` zodat bestaande route-guards vanzelf naar het inlogscherm sturen.
 */
export async function getActiveUser(): Promise<SessionUser | null> {
  const session = await getSession()
  if (!session?.user) return null

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { blockedAt: true, deletedAt: true, isPlatformAdmin: true },
  })
  if (!dbUser || dbUser.blockedAt || dbUser.deletedAt) return null

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
    isPlatformAdmin: dbUser.isPlatformAdmin,
  }
}

/**
 * Vereist een ingelogde gebruiker. Gooit een fout wanneer er geen sessie is
 * (of de gebruiker geblokkeerd is), zodat aanroepers nooit per ongeluk zonder
 * gebruiker verder werken. (Security: gebruikers zien uitsluitend hun eigen
 * gegevens — BR §13.)
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getActiveUser()
  if (!user) {
    throw new Error('UNAUTHENTICATED')
  }
  return user
}
