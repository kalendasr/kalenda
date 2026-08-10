import { useState } from 'react'

import { signIn } from '#/lib/auth-client.ts'
import { Button } from '#/components/ui/button.tsx'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.11C3.26 21.3 7.3 24 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * "Doorgaan met Google"-knop voor login/registratie. Toont zichzelf niet als
 * Google-login niet is geconfigureerd (zie GOOGLE_CLIENT_ID in .env.example).
 */
export function GoogleSignInButton({
  enabled,
  callbackURL,
}: {
  enabled: boolean
  callbackURL: string
}) {
  const [isPending, setIsPending] = useState(false)

  if (!enabled) return null

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true)
        await signIn.social({ provider: 'google', callbackURL })
      }}
    >
      <GoogleIcon />
      {isPending ? 'Even geduld…' : 'Doorgaan met Google'}
    </Button>
  )
}
