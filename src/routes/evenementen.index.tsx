import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays, MapPin } from 'lucide-react'

import { listPublishedEvents } from '#/server/public-events.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'

export const Route = createFileRoute('/evenementen/')({
  loader: async () => ({ events: await listPublishedEvents() }),
  head: () => ({ meta: [{ title: 'Evenementen · Kalenda' }] }),
  component: PublicEvents,
})

function PublicEvents() {
  const { events } = Route.useLoaderData()

  return (
    <>
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-(--container-content) px-4 py-10 sm:px-6"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Evenementen</h1>
        <p className="mt-2 text-muted-foreground">
          Ontdek wat er te doen is in Suriname.
        </p>

        {events.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed py-16 text-center">
            <p className="font-medium">Nog geen evenementen</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Er zijn op dit moment geen gepubliceerde evenementen. Kom snel
              terug.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  to="/evenementen/$slug"
                  params={{ slug: event.slug }}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt=""
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <CalendarDays className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {event.category ? (
                      <Badge variant="secondary" className="w-fit">
                        {event.category.name}
                      </Badge>
                    ) : null}
                    <h2 className="font-semibold">{event.title}</h2>
                    {event.shortDescription ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {event.shortDescription}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-col gap-1 pt-2 text-sm text-muted-foreground">
                      {event.startsAt ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {formatDateNl(event.startsAt)}
                        </span>
                      ) : null}
                      {event.venue ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {[event.venue.name, event.venue.district]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
