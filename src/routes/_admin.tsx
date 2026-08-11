import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Building2, LayoutDashboard, Ticket, Users } from 'lucide-react'

import { AppShell } from '#/components/app/app-shell.tsx'
import type { NavItem } from '#/components/app/app-shell.tsx'

/**
 * Layout voor het Platform Admin-workspace (Fase 11).
 *
 * Losstaand van `_app.tsx`: een platformbeheerder heeft geen organisatie en
 * hoort niet in het organisatietraject terecht te komen. Guard (analoog aan
 * `_app.tsx`, security §13): geen sessie → inloggen; wél ingelogd maar geen
 * `isPlatformAdmin` → terug naar de storefront (geen foutmelding die het
 * bestaan van `/admin` bevestigt).
 */
const ADMIN_NAV_ITEMS: Array<NavItem> = [
  { to: '/admin', label: 'Overzicht', icon: LayoutDashboard, exact: true },
  { to: '/admin/organizations', label: 'Organisaties', icon: Building2 },
  { to: '/admin/events', label: 'Evenementen', icon: Ticket },
  { to: '/admin/users', label: 'Gebruikers', icon: Users },
]

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context }) => {
    const { user } = context

    if (!user) {
      throw redirect({ to: '/login', search: { redirect: undefined } })
    }
    if (!user.isPlatformAdmin) {
      throw redirect({ to: '/' })
    }

    return { user }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell user={user} navItems={ADMIN_NAV_ITEMS} primaryAction={null}>
      <Outlet />
    </AppShell>
  )
}
