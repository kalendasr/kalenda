import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

import { cn } from '#/lib/utils.ts'
import { Badge } from '#/components/ui/badge.tsx'

/**
 * Organisatie-workspace (PRODUCT_ARCHITECTURE.md §5, DESIGN_SYSTEM.md §20):
 * Header → status → Tabs → Content.
 *
 * Tabs zijn gegroepeerd naar wat de organisator wil doen — Profiel / Geld /
 * Beheer — dezelfde indeling als de event-workspace, zodat de twee
 * workspaces consistent aanvoelen.
 */
export const Route = createFileRoute('/_app/organization')({
  component: OrganizationWorkspace,
})

type TabGroup = {
  label: string
  tabs: Array<{ to: string; label: string; exact: boolean }>
}

const TAB_GROUPS: Array<TabGroup> = [
  {
    label: '',
    tabs: [{ to: '/organization', label: 'Overzicht', exact: true }],
  },
  {
    label: 'Profiel',
    tabs: [{ to: '/organization/details', label: 'Details', exact: false }],
  },
  {
    label: 'Geld',
    tabs: [{ to: '/organization/payments', label: 'Betalingen', exact: false }],
  },
  {
    label: 'Beheer',
    tabs: [
      { to: '/organization/settings', label: 'Instellingen', exact: false },
    ],
  },
]

function OrganizationWorkspace() {
  const { organization } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
            {organization.name}
          </h1>
          {organization.isVerified ? (
            <Badge variant="soft-success">Geverifieerd</Badge>
          ) : (
            <Badge variant="soft-warning">Niet geverifieerd</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Je profiel, betaalmethoden en accountbeheer.
        </p>
      </header>

      <nav
        className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b"
        aria-label="Organisatie-onderdelen"
      >
        {TAB_GROUPS.map((group, index) => (
          <div key={group.label || index} className="flex flex-col gap-1.5">
            <span className="font-eyebrow min-h-3 px-0.5 text-[9.5px] font-medium tracking-[0.11em] text-muted-foreground/70 uppercase">
              {group.label}
            </span>
            <div className="flex gap-0.5">
              {group.tabs.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{
                    className: cn('border-primary text-foreground'),
                    'aria-current': 'page',
                  }}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
