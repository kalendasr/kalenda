import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import {
  archiveEventAdmin,
  deleteEventAdmin,
  getEventDetail,
  publishEventAdmin,
  unpublishEventAdmin,
} from '#/server/admin/events.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { canDeleteEvent, canUnpublishEvent } from '#/lib/event-lifecycle.ts'
import { errorMessage } from '#/lib/error-message.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/events/$eventId')({
  loader: async ({ params }) =>
    getEventDetail({ data: { eventId: params.eventId } }),
  component: AdminEventDetail,
  pendingComponent: () => <RoutePendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

function AdminEventDetail() {
  const {
    event,
    realisedRevenueCents,
    realisedOrderCount,
    orderCount,
    ticketsIssued,
    ticketsCheckedIn,
  } = Route.useLoaderData()
  const router = useRouter()

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      await router.invalidate()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  // Dezelfde regels als de organisator: de knop is alleen beschikbaar wanneer
  // de actie daadwerkelijk mag. De server controleert het nogmaals.
  const unpublishable = canUnpublishEvent({ ticketCount: ticketsIssued })
  const deletable = canDeleteEvent({ status: event.status, orderCount })

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={[
          { label: 'Evenementen', to: '/admin/events' },
          { label: event.title },
        ]}
        title={event.title}
        description={
          event.startsAt
            ? formatDateTimeNl(event.startsAt)
            : 'Nog geen datum ingesteld'
        }
        actions={
          <EventStatusBadge
            status={event.status}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
          />
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Gerealiseerde omzet"
          value={formatSrd(realisedRevenueCents)}
          subtext={`${realisedOrderCount} van ${orderCount} bestellingen`}
        />
        <StatCard label="Tickets uitgegeven" value={ticketsIssued} />
        <StatCard
          label="Ingecheckt"
          value={ticketsCheckedIn}
          subtext={
            ticketsIssued === 0
              ? 'Nog geen tickets'
              : `${Math.round((ticketsCheckedIn / ticketsIssued) * 100)}% van uitgegeven`
          }
        />
        <StatCard label="Bestellingen" value={orderCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evenementgegevens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Slug" value={`/${event.slug}`} />
            <Field label="Categorie" value={event.category?.name ?? '—'} />
            <Field
              label="Locatie"
              value={
                event.venue
                  ? [event.venue.name, event.venue.district]
                      .filter(Boolean)
                      .join(', ')
                  : 'Nog geen locatie'
              }
            />
            <Field label="Tijdzone" value={event.timezone} />
            <Field
              label="Eindtijd"
              value={event.endsAt ? formatDateTimeNl(event.endsAt) : '—'}
            />
            <Field
              label="Aangemaakt op"
              value={formatDateTimeNl(event.createdAt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organisator</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              to="/admin/organizations/$organizationId"
              params={{ organizationId: event.organization.id }}
              className="font-semibold hover:underline"
            >
              {event.organization.name}
            </Link>
            <div className="flex flex-wrap gap-2">
              {event.organization.isVerified ? (
                <Badge variant="soft-info">Geverifieerd</Badge>
              ) : null}
              {event.organization.deletedAt ? (
                <Badge variant="soft-destructive">Gedeactiveerd</Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <Link
                to="/admin/orders"
                search={{ eventId: event.id }}
                className="font-semibold text-primary hover:underline"
              >
                Bestellingen van dit evenement
              </Link>
              <Link
                to="/admin/tickets"
                search={{ eventId: event.id }}
                className="font-semibold text-primary hover:underline"
              >
                Tickets van dit evenement
              </Link>
              <Link
                to="/admin/check-ins"
                search={{ eventId: event.id }}
                className="font-semibold text-primary hover:underline"
              >
                Check-ins van dit evenement
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="gap-0 px-0 pb-2">
        <CardHeader className="px-5 pb-4">
          <CardTitle className="text-base">Tickettypes</CardTitle>
        </CardHeader>
        {event.ticketTypes.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">
            Dit evenement heeft nog geen tickettypes. Zonder tickettype kan het
            niet gepubliceerd worden.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tickettype</TableHead>
                <TableHead className="text-right">Prijs</TableHead>
                <TableHead className="text-right">Verkocht</TableHead>
                <TableHead className="text-right">Capaciteit</TableHead>
                <TableHead>Zichtbaar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {event.ticketTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {type.priceCents === 0
                      ? 'Gratis'
                      : formatSrd(type.priceCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {type.sold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {type.quantity}
                  </TableCell>
                  <TableCell>
                    {type.visible ? (
                      <Badge variant="soft-success">Zichtbaar</Badge>
                    ) : (
                      <Badge variant="soft-muted">Verborgen</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beheeracties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {event.status !== 'Published' ? (
            <ActionRow
              title="Evenement publiceren"
              description="Het evenement verschijnt op de website en tickets zijn te koop. Dezelfde volledigheidscontrole geldt als voor de organisator."
            >
              <ConfirmDialog
                title={`${event.title} publiceren?`}
                description="Het evenement komt direct op de website te staan en bezoekers kunnen tickets bestellen. Deze actie wordt vastgelegd in het logboek."
                confirmLabel="Publiceren"
                onConfirm={() =>
                  run(
                    () => publishEventAdmin({ data: { eventId: event.id } }),
                    'Evenement gepubliceerd.',
                  )
                }
                trigger={
                  <Button variant="outline" size="sm">
                    Publiceren
                  </Button>
                }
              />
            </ActionRow>
          ) : null}

          {event.status === 'Published' ? (
            <ActionRow
              title="Terug naar concept"
              description={
                unpublishable.ok
                  ? 'Het evenement verdwijnt van de website en is weer te bewerken.'
                  : unpublishable.reason
              }
            >
              <ConfirmDialog
                title={`${event.title} terugzetten naar concept?`}
                description="Het evenement verdwijnt direct van de website en er kunnen geen tickets meer besteld worden. Deze actie wordt vastgelegd in het logboek."
                confirmLabel="Naar concept"
                destructive
                onConfirm={() =>
                  run(
                    () => unpublishEventAdmin({ data: { eventId: event.id } }),
                    'Evenement staat weer op concept.',
                  )
                }
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!unpublishable.ok}
                  >
                    Naar concept
                  </Button>
                }
              />
            </ActionRow>
          ) : null}

          {event.status !== 'Archived' ? (
            <ActionRow
              title="Evenement archiveren"
              description="Het evenement verdwijnt van de website, maar bestellingen, betalingen en tickets blijven volledig bewaard. Dit is de juiste keuze zodra er al verkocht is."
            >
              <ConfirmDialog
                title={`${event.title} archiveren?`}
                description="Het evenement verdwijnt van de website. Alle bestellingen, betalingen en tickets blijven bestaan en uitgegeven tickets blijven scanbaar. Deze actie wordt vastgelegd in het logboek."
                confirmLabel="Archiveren"
                destructive
                onConfirm={() =>
                  run(
                    () => archiveEventAdmin({ data: { eventId: event.id } }),
                    'Evenement gearchiveerd.',
                  )
                }
                trigger={
                  <Button variant="outline" size="sm">
                    Archiveren
                  </Button>
                }
              />
            </ActionRow>
          ) : null}

          <ActionRow
            title="Evenement verwijderen"
            description={
              deletable.ok
                ? 'Alleen mogelijk voor een concept zonder bestellingen. Het evenement verdwijnt uit alle overzichten.'
                : deletable.reason
            }
          >
            <ConfirmDialog
              title={`${event.title} verwijderen?`}
              description="Het evenement verdwijnt uit alle overzichten. Dit kan alleen bij een concept zonder bestellingen, zodat er nooit administratie verloren gaat. Deze actie wordt vastgelegd in het logboek."
              confirmLabel="Verwijderen"
              destructive
              onConfirm={() =>
                run(
                  () => deleteEventAdmin({ data: { eventId: event.id } }),
                  'Evenement verwijderd.',
                )
              }
              trigger={
                <Button variant="outline" size="sm" disabled={!deletable.ok}>
                  Verwijderen
                </Button>
              }
            />
          </ActionRow>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}

function ActionRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
      <div className="max-w-lg min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
