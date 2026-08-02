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
