import { createAuthClient } from 'better-auth/react'

/**
 * Browser-side auth client. Praat met de route in
 * src/routes/api/auth/$.ts op dezelfde origin.
 */
export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession } = authClient
