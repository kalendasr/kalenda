import { Link, createFileRoute } from '@tanstack/react-router'

import { getPlatformReport } from '#/server/admin/reports.ts'
import { platformReportInputSchema } from '#/lib/validation/admin.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import { FilterPills } from '#/components/app/admin/list-toolbar.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
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

export const Route = createFileRoute('/_admin/admin/reports')({
  validateSearch: platformReportInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    report: await getPlatformReport({ data: deps }),
  }),
  component: AdminReports,
  pendingComponent: () => <RoutePendingState rows={5} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dagen' },
  { value: '30d', label: '30 dagen' },
  { value: '90d', label: '90 dagen' },
  { value: '12m', label: '12 maanden' },
  { value: 'all', label: 'Alles' },
] as const

function AdminReports() {
  const { report } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Rapportages"
        description={
          report.startsAt
            ? `Cijfers vanaf ${formatDateNl(report.startsAt)}, in Suriname-tijd.`
            : 'Cijfers over de volledige levensduur van het platform.'
        }
        actions={
          <FilterPills
            label="Periode"
            value={search.period}
            options={PERIOD_OPTIONS}
            onChange={(period) =>
              void navigate({ search: { period }, replace: true })
            }
          />
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Gerealiseerde omzet"
          value={formatSrd(report.revenue.realisedCents)}
          subtext={`${report.revenue.realisedOrderCount} betaalde bestellingen`}
          tone="success"
        />
        <StatCard label="Tickets verkocht" value={report.ticketsSold} />
        <StatCard label="Ingecheckt" value={report.ticketsCheckedIn} />
        <StatCard
          label="Servicekosten"
          value={formatSrd(report.revenue.serviceFeeCents)}
          subtext="Nooit automatisch ingehouden"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wat telt niet als omzet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Alleen betaalde en afgeronde bestellingen tellen als omzet.
            Hieronder staat expliciet wat daarbuiten valt, zodat de bedragen
            nooit te rooskleurig gelezen worden.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
                Geannuleerd en verlopen
              </div>
              <div className="mt-2 text-[22px] font-extrabold tabular-nums">
                {formatSrd(report.revenue.lostCents)}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {report.revenue.lostOrderCount} bestellingen die nooit betaald
                zijn. Dit is geen omzet en wordt het ook niet meer.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <div className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
                Nog onbeslist
              </div>
              <div className="mt-2 text-[22px] font-extrabold tabular-nums">
                {formatSrd(report.revenue.pendingCents)}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {report.revenue.pendingOrderCount} bestellingen die nog op
                betaling of controle wachten. Kan alsnog omzet worden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Nieuwe gebruikers" value={report.newUsers} />
        <StatCard label="Nieuwe organisaties" value={report.newOrganizations} />
        <StatCard label="Nieuwe evenementen" value={report.newEvents} />
      </section>

      <Card className="gap-0 px-0 pb-2">
        <CardHeader className="px-5 pb-4">
          <CardTitle className="text-base">
            Best verkopende evenementen
          </CardTitle>
        </CardHeader>
        {report.topEvents.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">
            In deze periode zijn er nog geen betaalde bestellingen. Kies een
            langere periode of wacht tot de eerste verkoop binnen is.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evenement</TableHead>
                <TableHead>Organisatie</TableHead>
                <TableHead className="text-right">Bestellingen</TableHead>
                <TableHead className="text-right">Omzet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topEvents.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell>
                    <Link
                      to="/admin/events/$eventId"
                      params={{ eventId: row.eventId }}
                      className="font-medium hover:underline"
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.organizationName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.orderCount}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatSrd(row.revenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="gap-0 px-0 pb-2">
        <CardHeader className="px-5 pb-4">
          <CardTitle className="text-base">
            Best presterende organisaties
          </CardTitle>
        </CardHeader>
        {report.topOrganizations.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">
            In deze periode zijn er nog geen betaalde bestellingen.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisatie</TableHead>
                <TableHead className="text-right">Bestellingen</TableHead>
                <TableHead className="text-right">Omzet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topOrganizations.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$organizationId"
                      params={{ organizationId: row.organizationId }}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.orderCount}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatSrd(row.revenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
