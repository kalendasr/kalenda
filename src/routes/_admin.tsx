import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  QrCode,
  Receipt,
  ScrollText,
  Settings,
  Ticket,
  Users,
} from 'lucide-react'

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
  { to: '/admin/events', label: 'Evenementen', icon: CalendarDays },
  { to: '/admin/orders', label: 'Bestellingen', icon: Receipt },
  { to: '/admin/payments', label: 'Betalingen', icon: CreditCard },
  { to: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { to: '/admin/check-ins', label: 'Check-ins', icon: QrCode },
  { to: '/admin/users', label: 'Gebruikers', icon: Users },
  { to: '/admin/reports', label: 'Rapportages', icon: BarChart3 },
  { to: '/admin/audit-logs', label: 'Logboek', icon: ScrollText },
  { to: '/admin/settings', label: 'Instellingen', icon: Settings },
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
