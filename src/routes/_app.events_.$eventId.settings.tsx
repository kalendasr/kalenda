import * as React from 'react'
import {
  Link,
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { CheckCircle2, Circle } from 'lucide-react'

import {
  archiveEvent,
  deleteEvent,
  publishEvent,
  unpublishEvent,
} from '#/server/event.ts'
import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import { cn } from '#/lib/utils.ts'
import { toast } from '#/components/ui/sonner.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'

/**
 * Instellingen-tab: alléén beheer van dit evenement — publicatie, meldingen en
 * levensduur. Alles wat bezoekers zien staat onder Details, verkoopregels onder
 * Tickets.
 */
export const Route = createFileRoute('/_app/events_/$eventId/settings')({
  component: EventSettings,
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

type EventData = ReturnType<typeof workspaceRoute.useLoaderData>['event']

function EventSettings() {
  const { event } = workspaceRoute.useLoaderData()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-pretty text-muted-foreground">
        Alleen beheer van dit evenement — publicatie, meldingen en levensduur.
        Alles wat bezoekers zien staat onder <strong>Details</strong>,
        verkoopregels onder <strong>Tickets</strong>.
      </p>
      <PublicationCard event={event} />
      <NotificationsCard />
      <DangerZone event={event} />
    </div>
  )
}

function PublicationCard({ event }: { event: EventData }) {
  const router = useRouter()
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

  if (event.status === 'Published') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Gepubliceerd</span>
              <span className="block text-sm text-muted-foreground">
                Zichtbaar op kalenda.sr.
              </span>
            </span>
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
              Terug naar concept
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (event.status === 'Archived') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
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
              Terug naar concept
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publiceren</CardTitle>
        <CardDescription>
          {readiness.ready
            ? 'Alles staat klaar. Publiceer je evenement om het op de website te tonen.'
            : 'Vul deze onderdelen aan voordat je publiceert.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {READINESS_ITEMS.map((item) => {
            const missing = readiness.missing.some((m) => m.key === item.key)
            return (
              <li key={item.key} className="flex items-center gap-2 text-sm">
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
  )
}

const READINESS_ITEMS: Array<{
  key: string
  label: string
  to?: '/events/$eventId/details' | '/events/$eventId/tickets'
}> = [
  { key: 'title', label: 'Titel', to: '/events/$eventId/details' },
  { key: 'description', label: 'Omschrijving', to: '/events/$eventId/details' },
  { key: 'startsAt', label: 'Datum en tijd', to: '/events/$eventId/details' },
  { key: 'category', label: 'Categorie', to: '/events/$eventId/details' },
  { key: 'venue', label: 'Locatie', to: '/events/$eventId/details' },
  { key: 'cover', label: 'Coverfoto', to: '/events/$eventId/details' },
  {
    key: 'ticketType',
    label: 'Minimaal één tickettype',
    to: '/events/$eventId/tickets',
  },
  { key: 'payment', label: 'Actieve betaalmethode' },
]

/**
 * Per-event meldingen. Front-end-only in deze ronde — persistentie van
 * meldingsvoorkeuren volgt in een vervolgronde.
 */
function NotificationsCard() {
  const [toggles, setToggles] = React.useState({
    newOrder: true,
    dailyDigest: true,
    payoutMail: false,
  })

  const rows: Array<{ key: keyof typeof toggles; title: string; sub: string }> =
    [
      {
        key: 'newOrder',
        title: 'Mail bij nieuwe order',
        sub: 'Direct bericht zodra iemand koopt.',
      },
      {
        key: 'dailyDigest',
        title: 'Dagelijkse samenvatting',
        sub: 'Elke ochtend één mail met de stand.',
      },
      {
        key: 'payoutMail',
        title: 'Mail bij uitbetaling',
        sub: 'Bericht wanneer geld is overgemaakt.',
      },
    ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meldingen</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center gap-4 py-3 first:pt-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{row.title}</span>
              <span className="block text-sm text-muted-foreground">
                {row.sub}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={toggles[row.key]}
              onClick={() =>
                setToggles((t) => ({ ...t, [row.key]: !t[row.key] }))
              }
              className={cn(
                'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
                toggles[row.key]
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {toggles[row.key] ? 'Aan' : 'Uit'}
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function DangerZone({ event }: { event: EventData }) {
  const navigate = useNavigate()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function handleArchive() {
    setBusy(true)
    try {
      await archiveEvent({ data: { eventId: event.id } })
      await router.invalidate()
      toast.success('Het evenement is gearchiveerd.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteEvent({ data: { eventId: event.id } })
      await router.invalidate()
      toast.success('Het concept is verwijderd.')
      await navigate({ to: '/events' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Verwijderen mislukt.',
      )
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          Evenement afsluiten
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {event.status !== 'Archived' ? (
          <div className="flex flex-wrap items-center gap-4 py-3 first:pt-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Archiveren</span>
              <span className="block text-sm text-muted-foreground">
                Haal het evenement van de website en zet het opzij. Orders en
                rapportages blijven bewaard.
              </span>
            </span>
            <ConfirmDialog
              title="Evenement archiveren?"
              description="Het evenement wordt van de website gehaald. Je kunt het later terugzetten naar concept."
              confirmLabel="Archiveren"
              onConfirm={handleArchive}
              trigger={
                <Button variant="outline" size="sm" disabled={busy}>
                  Archiveren
                </Button>
              }
            />
          </div>
        ) : null}

        {event.status === 'Draft' ? (
          <div className="flex flex-wrap items-center gap-4 py-3 first:pt-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-destructive">
                Verwijderen
              </span>
              <span className="block text-sm text-muted-foreground">
                Kan alleen als er geen tickets verkocht zijn. Dit is definitief.
              </span>
            </span>
            <ConfirmDialog
              title="Concept verwijderen?"
              description="Dit evenement wordt definitief verwijderd. Deze actie kan niet ongedaan worden gemaakt."
              confirmLabel="Verwijderen"
              destructive
              onConfirm={handleDelete}
              trigger={
                <Button variant="destructive" size="sm">
                  Verwijderen
                </Button>
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
