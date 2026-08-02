import * as React from 'react'
import {
  Link,
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router'
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Circle,
  ExternalLink,
  MapPin,
  Tag,
  Undo2,
} from 'lucide-react'

import { archiveEvent, publishEvent, unpublishEvent } from '#/server/event.ts'
import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { toast } from '#/components/ui/sonner.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/')({
  component: EventOverview,
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

function EventOverview() {
  const router = useRouter()
  const { event } = workspaceRoute.useLoaderData()
  const [busy, setBusy] = React.useState(false)

  const readiness = eventPublishReadiness(
    { ...event, ticketTypeCount: event.ticketTypes.length },
    event.organization.paymentSettings,
  )

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    try {
      await action()
      await router.invalidate()
      toast.success(message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {event.status === 'Draft' ? (
        <Card>
          <CardHeader>
            <CardTitle>Publiceren</CardTitle>
            <CardDescription>
              {readiness.ready
                ? 'Alles staat klaar. Publiceer je evenement om het op de website te tonen.'
                : 'Vul deze onderdelen aan voordat je publiceert.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {READINESS_ITEMS.map((item) => {
                const missing = readiness.missing.some(
                  (m) => m.key === item.key,
                )
                return (
                  <li
                    key={item.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    {missing ? (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    )}
                    <span className={missing ? '' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                    {missing && item.to ? (
                      <Link
                        to={item.to}
                        params={{ eventId: event.id }}
                        className="ml-auto text-xs font-medium text-primary hover:underline"
                      >
                        Aanvullen
                      </Link>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            <div>
              <Button
                disabled={!readiness.ready || busy}
                onClick={() =>
                  run(
                    () => publishEvent({ data: { eventId: event.id } }),
                    'Je evenement is gepubliceerd en staat nu op de website.',
                  )
                }
              >
                Publiceren
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {event.status === 'Published' ? (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Gepubliceerd</AlertTitle>
          <AlertDescription className="gap-2">
            <span>Dit evenement is zichtbaar op de website.</span>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/evenementen/${event.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink /> Bekijk publieke pagina
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => unpublishEvent({ data: { eventId: event.id } }),
                    'Terug naar concept. Het evenement staat niet meer op de website.',
                  )
                }
              >
                <Undo2 /> Terug naar concept
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {event.status === 'Archived' ? (
        <Alert variant="warning">
          <Archive />
          <AlertTitle>Gearchiveerd</AlertTitle>
          <AlertDescription className="gap-2">
            <span>
              Dit evenement is gearchiveerd en niet zichtbaar op de website.
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => unpublishEvent({ data: { eventId: event.id } }),
                  'Het evenement staat weer op concept.',
                )
              }
            >
              <Undo2 /> Terug naar concept
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <SummaryCard event={event} />

      {event.status !== 'Archived' ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Archiveren</CardTitle>
              <CardDescription>
                Haal het evenement van de website en zet het opzij.
              </CardDescription>
            </div>
            <ConfirmDialog
              title="Evenement archiveren?"
              description="Het evenement wordt van de website gehaald. Je kunt het later terugzetten naar concept."
              confirmLabel="Archiveren"
              onConfirm={() =>
                run(
                  () => archiveEvent({ data: { eventId: event.id } }),
                  'Het evenement is gearchiveerd.',
                )
              }
              trigger={
                <Button variant="outline" size="sm" disabled={busy}>
                  <Archive /> Archiveren
                </Button>
              }
            />
          </CardHeader>
        </Card>
      ) : null}
    </div>
  )
}

const READINESS_ITEMS: Array<{
  key: string
  label: string
  to?: '/events/$eventId/settings' | '/events/$eventId/tickets'
}> = [
  { key: 'title', label: 'Titel', to: '/events/$eventId/settings' },
  {
    key: 'description',
    label: 'Omschrijving',
    to: '/events/$eventId/settings',
  },
  { key: 'startsAt', label: 'Datum en tijd', to: '/events/$eventId/settings' },
  { key: 'category', label: 'Categorie', to: '/events/$eventId/settings' },
  { key: 'venue', label: 'Locatie', to: '/events/$eventId/settings' },
  { key: 'cover', label: 'Coverfoto', to: '/events/$eventId/settings' },
  {
    key: 'ticketType',
    label: 'Minimaal één tickettype',
    to: '/events/$eventId/tickets',
  },
  { key: 'payment', label: 'Actieve betaalmethode' },
]

function SummaryCard({
  event,
}: {
  event: ReturnType<typeof workspaceRoute.useLoaderData>['event']
}) {
  const rows = [
    {
      icon: CalendarDays,
      value: event.startsAt ? formatDateTimeNl(event.startsAt) : null,
    },
    { icon: MapPin, value: event.venue?.name ?? null },
    { icon: Tag, value: event.category?.name ?? null },
  ].filter((row) => row.value)

  return (
    <Card>
      <CardContent className="flex gap-4 pt-6">
        <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Geen cover</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {event.shortDescription ? (
            <p className="text-sm text-muted-foreground">
              {event.shortDescription}
            </p>
          ) : null}
          <dl className="mt-2 flex flex-col gap-1.5">
            {rows.map((row, index) => {
              const Icon = row.icon
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate text-foreground">{row.value}</span>
                </div>
              )
            })}
          </dl>
          <Button asChild variant="link" className="mt-2 h-auto px-0">
            <Link to="/events/$eventId/settings" params={{ eventId: event.id }}>
              Gegevens bewerken
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
