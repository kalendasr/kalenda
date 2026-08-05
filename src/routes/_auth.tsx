import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { fetchSessionUser } from '#/server/session.ts'

/**
 * Layout voor de authenticatieschermen (registreren, inloggen, wachtwoord).
 * Een rustige, gecentreerde kaart (DESIGN_SYSTEM.md §2 "Calm Interface").
 * Al ingelogde gebruikers worden doorgestuurd naar het dashboard.
 */
export const Route = createFileRoute('/_auth')({
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
  }),
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
      className="app-shell flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12 text-foreground"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-primary/10">
            <CalendarDays
              className="size-[17px] text-primary"
              aria-hidden="true"
            />
          </span>
          <span className="text-[18px] font-extrabold tracking-[-0.02em]">
            Kalenda
          </span>
        </div>
        <Outlet />
      </div>
    </main>
  )
}
