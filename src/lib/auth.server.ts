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
 * Fase 10: optioneel inloggen met Google. De User is uitgebreid met de
 * domeinvelden uit DATABASE_DOMAIN.md §4; `name` wordt bij registratie
 * samengesteld uit voor- en achternaam. Google levert geen gesplitste naam,
 * dus die wordt hier uit het Google-profiel afgeleid (BR: firstName/lastName
 * blijven verplicht, ook voor social login).
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
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            mapProfileToUser: (profile) => {
              const [firstName, ...rest] = profile.name.split(' ')
              return {
                firstName: profile.given_name || firstName || profile.name,
                lastName: profile.family_name || rest.join(' ') || '-',
              }
            },
          },
        }
      : undefined,
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true, input: true },
      lastName: { type: 'string', required: true, input: true },
      phone: { type: 'string', required: false, input: true },
      locale: { type: 'string', required: false, input: false },
      timezone: { type: 'string', required: false, input: false },
    },
  },
  account: {
    // Koppel Google automatisch aan een bestaand wachtwoord-account met
    // hetzelfde e-mailadres, zodat `account_not_linked` niet optreedt. We
    // hebben geen e-mailverificatieflow, dus lokale accounts blijven altijd
    // `emailVerified: false` — `requireLocalEmailVerified` moet daarom uit
    // staan, anders blokkeert better-auth het koppelen alsnog.
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      requireLocalEmailVerified: false,
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
