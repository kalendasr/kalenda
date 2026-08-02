import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '#/lib/db.server.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { sendPasswordResetEmail } from '#/lib/emails.server.ts'

const env = getServerEnv()

/**
 * Better Auth server instance.
 *
 * Fase 1: registreren, inloggen en wachtwoord resetten met echte e-mail.
 * De User is uitgebreid met de domeinvelden uit DATABASE_DOMAIN.md §4;
 * `name` wordt bij registratie samengesteld uit voor- en achternaam.
 */
export const auth = betterAuth({
  appName: 'Kalenda',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url })
    },
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true, input: true },
      lastName: { type: 'string', required: true, input: true },
      phone: { type: 'string', required: false, input: true },
      locale: { type: 'string', required: false, input: false },
      timezone: { type: 'string', required: false, input: false },
    },
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
