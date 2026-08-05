import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, ScanLine } from 'lucide-react'

import { getMyEvent } from '#/server/event.ts'
import { cn } from '#/lib/utils.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { Button } from '#/components/ui/button.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'

/**
 * Event-workspace (PRODUCT_ARCHITECTURE.md §5). De organisator blijft binnen
 * dezelfde workspace terwijl hij het evenement inricht, verkoopt en uitvoert.
 *
 * De tabs zijn gegroepeerd naar wat de organisator wil doen — Inrichten /
 * Verkopen / Uitvoeren / Beheer — zodat verwante taken bij elkaar staan in
 * plaats van als losse platte lijst.
 */
export const Route = createFileRoute('/_app/events_/$eventId')({
  loader: async ({ params }) => {
    try {
      const event = await getMyEvent({ data: { eventId: params.eventId } })
      if (!event) throw redirect({ to: '/events' })
      return { event }
    } catch (error) {
      if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
        throw redirect({ to: '/events' })
      }
      throw error
    }
  },
  component: EventWorkspace,
})

type TabGroup = {
  label: string
  tabs: Array<{
    to: string
    label: string
    exact: boolean
  }>
}

const TAB_GROUPS: Array<TabGroup> = [
  {
    label: '',
    tabs: [{ to: '/events/$eventId', label: 'Overzicht', exact: true }],
  },
  {
    label: 'Inrichten',
    tabs: [
      { to: '/events/$eventId/details', label: 'Details', exact: false },
      { to: '/events/$eventId/tickets', label: 'Tickets', exact: false },
    ],
  },
  {
    label: 'Verkopen',
    tabs: [
      { to: '/events/$eventId/orders', label: 'Orders', exact: false },
      { to: '/events/$eventId/reports', label: 'Rapportages', exact: false },
    ],
  },
  {
    label: 'Uitvoeren',
    tabs: [{ to: '/events/$eventId/scanner', label: 'Entree', exact: false }],
  },
  {
    label: 'Beheer',
    tabs: [
      { to: '/events/$eventId/settings', label: 'Instellingen', exact: false },
    ],
  },
]

function EventWorkspace() {
  const { event } = Route.useLoaderData()

  const metaParts = [
    event.startsAt ? formatDateTimeNl(event.startsAt) : null,
    event.venue?.name,
    event.category?.name,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/events"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alle evenementen
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
              {event.title}
            </h1>
            <EventStatusBadge
              status={event.status}
              startsAt={event.startsAt}
              endsAt={event.endsAt}
            />
          </div>
          {metaParts.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {metaParts.join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status === 'Published' ? (
            <Button variant="outline" asChild>
              <a
                href={`/evenementen/${event.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink /> Publieke pagina
              </a>
            </Button>
          ) : null}
          <Button
            className="bg-foreground text-background hover:bg-foreground/90"
            asChild
          >
            <Link to="/events/$eventId/scanner" params={{ eventId: event.id }}>
              <ScanLine /> Scanner openen
            </Link>
          </Button>
        </div>
      </header>

      <nav
        className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b"
        aria-label="Evenement-onderdelen"
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
                  params={{ eventId: event.id }}
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
