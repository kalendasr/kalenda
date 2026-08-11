import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ImageIcon, Plus, Search, Ticket } from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { listMyEventsSummary } from '#/server/event.ts'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'

export const Route = createFileRoute('/_app/events/')({
  loader: async () => ({ events: await listMyEventsSummary() }),
  component: EventsList,
  pendingComponent: () => <RoutePendingState rows={5} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

type EventSummary = Awaited<ReturnType<typeof listMyEventsSummary>>[number]

const FILTERS = [
  { label: 'Alle', status: null },
  { label: 'Gepubliceerd', status: 'Published' as const },
  { label: 'Concept', status: 'Draft' as const },
  { label: 'Archief', status: 'Archived' as const },
]

function EventsList() {
  const { events } = Route.useLoaderData()
  const [filter, setFilter] = React.useState<string>('Alle')
  const [search, setSearch] = React.useState('')

  const visible = React.useMemo(() => {
    const active = FILTERS.find((f) => f.label === filter)
    const term = search.trim().toLowerCase()
    return events.filter((event) => {
      const okStatus = !active?.status || event.status === active.status
      const okSearch = !term || event.title.toLowerCase().includes(term)
      return okStatus && okSearch
    })
  }, [events, filter, search])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
            Evenementen
          </h1>
          <p className="mt-1 text-muted-foreground">
            Beheer je evenementen, van concept tot afgerond.
          </p>
        </div>
        <Button asChild>
          <Link to="/events/new">
            <Plus /> Nieuw evenement
          </Link>
        </Button>
      </header>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFilter(f.label)}
                  aria-pressed={filter === f.label}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                    filter === f.label
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="flex h-10 max-w-80 flex-1 items-center gap-2 rounded-xl border bg-background px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op naam"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              Geen evenementen gevonden voor deze filter.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function EventRow({ event }: { event: EventSummary }) {
  const pct =
    event.capacity > 0
      ? Math.min(100, Math.round((event.sold / event.capacity) * 100))
      : 0

  const meta = event.startsAt
    ? [formatDateNl(event.startsAt), event.venue?.name, event.category?.name]
        .filter(Boolean)
        .join(' · ')
    : 'Nog geen datum · nog geen tickets'

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-ring/40 hover:bg-accent"
    >
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold tracking-tight">
            {event.title}
          </span>
          <EventStatusBadge
            status={event.status}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
          />
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{meta}</div>
      </div>
      <div className="min-w-36 text-right">
        <div className="font-semibold tabular-nums">
          {formatSrd(event.revenueCents)}
        </div>
        <div className="mt-0.5 text-xs font-medium text-muted-foreground">
          {event.capacity > 0
            ? `${event.sold} van ${event.capacity} tickets`
            : 'Nog niet in verkoop'}
        </div>
        <div className="mt-2 ml-auto h-1.5 w-36 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full',
              pct > 0 ? 'bg-primary' : 'bg-border',
            )}
            style={{ width: `${Math.max(pct, event.capacity > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <Card className="items-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Ticket className="size-6" />
      </span>
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold">Nog geen evenementen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Maak je eerste evenement aan en vul het aan met alle informatie
          voordat je het publiceert.
        </p>
      </div>
      <Button asChild>
        <Link to="/events/new">
          <Plus /> Nieuw evenement
        </Link>
      </Button>
    </Card>
  )
}
