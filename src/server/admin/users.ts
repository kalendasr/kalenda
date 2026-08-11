import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { listUsersInputSchema } from '#/lib/validation/admin.ts'
import {
  deleteUserHandler,
  getUserDetailHandler,
  listUsersHandler,
  setUserBlockedHandler,
  setUserPlatformAdminHandler,
} from '#/server/admin/users.server.ts'

/**
 * Server functions voor gebruikersbeheer.
 *
 * Dit bestand bevat alleen de RPC-laag: validatie plus doorgeven aan de
 * handler. De logica en de autorisatie staan in `users.server.ts` — dat
 * bestand raakt de database en mag daarom nooit in de clientbundel belanden,
 * en is als gewone functie wél los te testen.
 */

export const listUsers = createServerFn({ method: 'GET' })
  .validator(listUsersInputSchema)
  .handler(({ data }) => listUsersHandler(data))

export const getUserDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.uuid() }))
  .handler(({ data }) => getUserDetailHandler(data))

export const setUserBlocked = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.uuid(), blocked: z.boolean() }))
  .handler(({ data }) => setUserBlockedHandler(data))

export const setUserPlatformAdmin = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.uuid(), isPlatformAdmin: z.boolean() }))
  .handler(({ data }) => setUserPlatformAdminHandler(data))

export const deleteUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.uuid() }))
  .handler(({ data }) => deleteUserHandler(data))
