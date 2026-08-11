import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '#/components/app/app-shell.tsx'

/**
 * Layout voor de ingelogde applicatie (dashboard + organisatie-workspace).
 *
 * Guards (BR §13): geen sessie → naar inloggen; wél ingelogd maar nog geen
 * organisatie → naar het organisatietraject. De sessiecontext komt uit de
 * `beforeLoad` van `__root.tsx`, dus geen extra round-trip hier.
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
  beforeLoad: async ({ context }) => {
    const { user, organization } = context

    if (!user) {
      throw redirect({ to: '/login', search: { redirect: undefined } })
    }

    if (!organization) {
      // Een platformbeheerder heeft nooit een eigen organisatie en hoort
      // niet in het organisatorstraject terecht te komen.
      throw redirect({
        to: user.isPlatformAdmin ? '/admin' : '/organisator/starten',
      })
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
