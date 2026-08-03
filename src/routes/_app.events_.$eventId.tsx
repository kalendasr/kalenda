import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { getMyEvent } from '#/server/event.ts'
import { cn } from '#/lib/utils.ts'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'

/**
 * Event-workspace (PRODUCT_ARCHITECTURE.md §5): de organisator blijft binnen
 * dezelfde workspace terwijl hij de modules Overzicht / Inhoud / Instellingen
 * doorloopt. Header → status → Tabs → Content (DESIGN_SYSTEM.md §20).
 */
export const Route = createFileRoute('/_app/events_/$eventId')({
  loader: async ({ params }) => {
    try {
      const event = await getMyEvent({ data: { eventId: params.eventId } })
      if (!event) throw redirect({ to: '/events' })
      return { event }
    } catch (error) {
      // Onbekend of niet van deze organisatie → terug naar de lijst.
      if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
        throw redirect({ to: '/events' })
      }
      throw error
    }
  },
  component: EventWorkspace,
})

const TABS = [
  { to: '/events/$eventId', label: 'Overzicht', exact: true },
  { to: '/events/$eventId/orders', label: 'Orders', exact: false },
  { to: '/events/$eventId/tickets', label: 'Tickets', exact: false },
  { to: '/events/$eventId/scanner', label: 'Scanner', exact: false },
  { to: '/events/$eventId/content', label: 'Inhoud', exact: false },
  { to: '/events/$eventId/settings', label: 'Instellingen', exact: false },
] as const

function EventWorkspace() {
  const { event } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/events"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alle evenementen
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {event.title}
          </h1>
          <EventStatusBadge
            status={event.status}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
          />
        </div>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b"
        aria-label="Evenement-onderdelen"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            params={{ eventId: event.id }}
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
