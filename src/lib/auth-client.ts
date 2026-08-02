import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

import type { auth } from '#/lib/auth.server.ts'

/**
 * Browser-side auth client. Praat met de route in
 * src/routes/api/auth/$.ts op dezelfde origin.
 *
 * `inferAdditionalFields` neemt de extra User-velden (firstName, lastName,
 * phone, …) mee in de types, zodat signUp die velden accepteert.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient
