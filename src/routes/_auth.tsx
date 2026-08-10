import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { fetchAuthProviders } from '#/server/session.ts'
import { safeRedirect } from '#/lib/safe-redirect.ts'
import { postAuthDestination } from '#/lib/post-auth-destination.ts'

/**
 * Layout voor de authenticatieschermen (registreren, inloggen, wachtwoord).
 * Een rustige, gecentreerde kaart (DESIGN_SYSTEM.md §2 "Calm Interface").
 * Al ingelogde gebruikers worden doorgestuurd naar waar ze horen — de
 * `redirect`-param wint (bijv. terug naar de afrekenpagina), anders het
 * dashboard voor organisatoren of de storefront voor kopers.
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
  beforeLoad: async ({ context, location }) => {
    if (context.user) {
      const search = location.search as { redirect?: unknown }
      const redirectTo = safeRedirect(
        typeof search.redirect === 'string' ? search.redirect : undefined,
      )
      throw redirect({
        href: postAuthDestination({
          redirectTo,
          hasOrganization: Boolean(context.organization),
        }),
      })
    }
  },
  loader: () => fetchAuthProviders(),
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
