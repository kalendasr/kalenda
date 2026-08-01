import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '#/lib/db.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'

const env = getServerEnv()

/**
 * Better Auth server instance.
 *
 * De registratie- en inlogflows zelf horen bij fase 1; hier staat alleen de
 * configuratie zodat de rest van het platform er tegenaan kan bouwen.
 */
export const auth = betterAuth({
  appName: 'Kalenda',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  advanced: {
    database: {
      // Non-negotiable: UUID primary keys op iedere entity.
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [tanstackStartCookies()],
})

export type Session = typeof auth.$Infer.Session
