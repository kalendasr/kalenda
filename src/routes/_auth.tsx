import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { fetchSessionUser } from '#/server/session.ts'

/**
 * Layout voor de authenticatieschermen (registreren, inloggen, wachtwoord).
 * Een rustige, gecentreerde kaart (DESIGN_SYSTEM.md §2 "Calm Interface").
 * Al ingelogde gebruikers worden doorgestuurd naar het dashboard.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const user = await fetchSessionUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-4" />
          Kalenda
        </div>
        <Outlet />
      </div>
    </main>
  )
}
