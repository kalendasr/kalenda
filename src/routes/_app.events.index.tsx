import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ImageIcon, Plus, Ticket } from 'lucide-react'

import { listMyEvents } from '#/server/event.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'

export const Route = createFileRoute('/_app/events/')({
  loader: async () => ({ events: await listMyEvents() }),
  component: EventsList,
})

function EventsList() {
  const { events } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evenementen</h1>
          <p className="text-muted-foreground">
            Beheer je evenementen en publiceer ze op de website.
          </p>
        </div>
        {events.length > 0 ? (
          <Button asChild>
            <Link to="/events/new">
              <Plus /> Nieuw evenement
            </Link>
          </Button>
        ) : null}
      </header>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="group flex items-center gap-4 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{event.title}</span>
                    <EventStatusBadge
                      status={event.status}
                      startsAt={event.startsAt}
                      endsAt={event.endsAt}
                    />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {event.startsAt
                        ? formatDateNl(event.startsAt)
                        : 'Nog geen datum'}
                    </span>
                    {event.category ? <span>{event.category.name}</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
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
