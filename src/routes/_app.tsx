import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { loadAppContext } from '#/server/app-context.ts'
import { AppShell } from '#/components/app/app-shell.tsx'

/**
 * Layout voor de ingelogde applicatie (dashboard + organisatie-workspace).
 *
 * Guards (BR §13): geen sessie → naar inloggen; wél ingelogd maar nog geen
 * organisatie → naar onboarding. De organisatie zit in de route-context zodat
 * de onderliggende schermen hem zonder extra fetch kunnen gebruiken.
 */
export const Route = createFileRoute('/_app')({
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
    const { user, organization } = await loadAppContext()

    if (!user) {
      throw redirect({ to: '/login' })
    }

    if (!organization) {
      throw redirect({ to: '/onboarding' })
    }

    return { user, organization }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
