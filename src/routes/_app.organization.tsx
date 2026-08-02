import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

import { cn } from '#/lib/utils.ts'
import { Badge } from '#/components/ui/badge.tsx'

/**
 * Organisatie-workspace (PRODUCT_ARCHITECTURE.md §5, DESIGN_SYSTEM.md §20):
 * Header → status → Tabs → Content. De gebruiker blijft binnen dezelfde
 * workspace terwijl hij de modules doorloopt.
 */
export const Route = createFileRoute('/_app/organization')({
  component: OrganizationWorkspace,
})

const TABS = [
  { to: '/organization', label: 'Overzicht', exact: true },
  { to: '/organization/general', label: 'Algemene gegevens', exact: false },
  { to: '/organization/branding', label: 'Branding', exact: false },
  { to: '/organization/payments', label: 'Betalingen', exact: false },
] as const

function OrganizationWorkspace() {
  const { organization } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {organization.name}
          </h1>
          {organization.isVerified ? (
            <Badge variant="secondary">Geverifieerd</Badge>
          ) : (
            <Badge variant="outline">Niet geverifieerd</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Beheer de gegevens, branding en betaalmethoden van je organisatie.
        </p>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b"
        aria-label="Organisatie-onderdelen"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.exact }}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{
              className: cn('border-primary text-foreground'),
              'aria-current': 'page',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
