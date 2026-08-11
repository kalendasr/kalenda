import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import {
  getOrganizationDetail,
  setOrganizationActive,
  setOrganizationVerified,
} from '#/server/admin/organizations.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl, formatDateTimeShortNl } from '#/lib/datetime.ts'
import { errorMessage } from '#/lib/error-message.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
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
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute(
  '/_admin/admin/organizations/$organizationId',
)({
  loader: async ({ params }) =>
    getOrganizationDetail({
      data: { organizationId: params.organizationId },
    }),
  component: AdminOrganizationDetail,
  pendingComponent: () => <AdminPendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

function AdminOrganizationDetail() {
  const {
    organization,
    events,
    realisedRevenueCents,
    realisedOrderCount,
    ticketsSold,
  } = Route.useLoaderData()
  const router = useRouter()

  const active = organization.deletedAt === null

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      await router.invalidate()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const paymentMethods = [
    organization.paymentSettings?.whatsappEnabled
      ? `WhatsApp (${organization.paymentSettings.whatsappApps.join(', ') || 'geen app'})`
      : null,
    organization.paymentSettings?.bankEnabled
      ? `Bankoverschrijving${organization.paymentSettings.bankName ? ` — ${organization.paymentSettings.bankName}` : ''}`
      : null,
  ].filter(Boolean) as Array<string>

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={[
          { label: 'Organisaties', to: '/admin/organizations' },
          { label: organization.name },
        ]}
        title={organization.name}
        description={`/${organization.slug}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {organization.isVerified ? (
              <Badge variant="soft-info">Geverifieerd</Badge>
            ) : null}
            {active ? (
              <Badge variant="soft-success">Actief</Badge>
            ) : (
              <Badge variant="soft-destructive">Gedeactiveerd</Badge>
            )}
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Evenementen" value={organization._count.events} />
        <StatCard label="Tickets verkocht" value={ticketsSold} />
        <StatCard label="Afgeronde bestellingen" value={realisedOrderCount} />
        <StatCard
          label="Gerealiseerde omzet"
          value={formatSrd(realisedRevenueCents)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Organisatiegegevens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Contact-e-mail" value={organization.email ?? '—'} />
            <Field label="Telefoon" value={organization.phone ?? '—'} />
            <Field label="Website" value={organization.website ?? '—'} />
            <Field
              label="Plaats"
              value={
                [organization.city, organization.country]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <Field
              label="Aangemaakt op"
              value={formatDateNl(organization.createdAt)}
            />
            <Field
              label="Betaalmethoden"
              value={
                paymentMethods.length ? paymentMethods.join(' · ') : 'Nog geen'
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eigenaar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              to="/admin/users/$userId"
              params={{ userId: organization.owner.id }}
              className="font-semibold hover:underline"
            >
              {organization.owner.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              {organization.owner.email}
            </span>
            {organization.owner.blockedAt ? (
              <Badge variant="soft-destructive">Account geblokkeerd</Badge>
            ) : null}
            {organization.owner.deletedAt ? (
              <Badge variant="soft-destructive">Account verwijderd</Badge>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Evenementen</CardTitle>
          <Link
            to="/admin/events"
            search={{ organizationId: organization.id }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Alle evenementen
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {events.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Deze organisatie heeft nog geen evenementen aangemaakt.
            </p>
          ) : (
            events.map((event) => (
              <Link
                key={event.id}
                to="/admin/events/$eventId"
                params={{ eventId: event.id }}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <span className="truncate font-semibold">{event.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {event.startsAt
                      ? formatDateTimeShortNl(event.startsAt)
                      : 'Nog geen datum'}
                  </span>
                </div>
                <EventStatusBadge
                  status={event.status}
                  startsAt={event.startsAt}
                  endsAt={event.endsAt}
                />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {event._count.orders}{' '}
                  {event._count.orders === 1 ? 'bestelling' : 'bestellingen'}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beheeracties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionRow
            title={
              organization.isVerified
                ? 'Verificatie intrekken'
                : 'Organisatie verifiëren'
            }
            description={
              organization.isVerified
                ? 'Het verificatiekenmerk verdwijnt van de organisatiepagina.'
                : 'Bezoekers zien dat het platform deze organisator gecontroleerd heeft.'
            }
          >
            <ConfirmDialog
              title={
                organization.isVerified
                  ? `Verificatie van ${organization.name} intrekken?`
                  : `${organization.name} verifiëren?`
              }
              description={
                organization.isVerified
                  ? 'Het verificatiekenmerk verdwijnt direct. De organisatie blijft gewoon werken. Deze actie wordt vastgelegd in het logboek.'
                  : 'Bezoekers zien voortaan een verificatiekenmerk bij deze organisator. Geef dit alleen na controle van de identiteit. Deze actie wordt vastgelegd in het logboek.'
              }
              confirmLabel={
                organization.isVerified ? 'Intrekken' : 'Verifiëren'
              }
              onConfirm={() =>
                run(
                  () =>
                    setOrganizationVerified({
                      data: {
                        organizationId: organization.id,
                        verified: !organization.isVerified,
                      },
                    }),
                  organization.isVerified
                    ? 'Verificatie ingetrokken.'
                    : 'Organisatie geverifieerd.',
                )
              }
              trigger={
                <Button variant="outline" size="sm">
                  {organization.isVerified ? 'Intrekken' : 'Verifiëren'}
                </Button>
              }
            />
          </ActionRow>

          <ActionRow
            title={
              active ? 'Organisatie deactiveren' : 'Organisatie heractiveren'
            }
            description={
              active
                ? 'De organisator verliest toegang tot de workspace en alle gepubliceerde evenementen verdwijnen van de website.'
                : 'De organisator krijgt weer toegang en eerder gepubliceerde evenementen verschijnen weer op de website.'
            }
          >
            <ConfirmDialog
              title={
                active
                  ? `${organization.name} deactiveren?`
                  : `${organization.name} heractiveren?`
              }
              description={
                active
                  ? 'De organisator kan niet meer bij de workspace en alle gepubliceerde evenementen verdwijnen direct van de website. Bestaande bestellingen en tickets blijven geldig. Je kunt dit later terugdraaien. Deze actie wordt vastgelegd in het logboek.'
                  : 'De organisator krijgt weer toegang tot de workspace en eerder gepubliceerde evenementen verschijnen weer op de website. Deze actie wordt vastgelegd in het logboek.'
              }
              confirmLabel={active ? 'Deactiveren' : 'Heractiveren'}
              destructive={active}
              onConfirm={() =>
                run(
                  () =>
                    setOrganizationActive({
                      data: {
                        organizationId: organization.id,
                        active: !active,
                      },
                    }),
                  active
                    ? 'Organisatie gedeactiveerd.'
                    : 'Organisatie heractiveerd.',
                )
              }
              trigger={
                <Button variant="outline" size="sm">
                  {active ? 'Deactiveren' : 'Heractiveren'}
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
