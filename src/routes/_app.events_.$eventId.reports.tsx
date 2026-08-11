import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { getEventReport } from '#/server/reports.ts'
import { formatSrd } from '#/lib/money.ts'
import { cn } from '#/lib/utils.ts'
import { StatCard } from '#/components/app/stat-card.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/reports')({
  loader: async ({ params }) => ({
    report: await getEventReport({ data: { eventId: params.eventId } }),
  }),
  component: EventReports,
  pendingComponent: () => <RoutePendingState rows={5} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

/** Bouwt en download een CSV volledig client-side, zonder externe libs. */
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  // BOM zodat Excel het bestand als UTF-8 herkent.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const CHECK_IN_LABELS: Record<string, string> = {
  Valid: 'Geldig',
  AlreadyCheckedIn: 'Al ingecheckt',
  Invalid: 'Ongeldig',
  NotFound: 'Niet gevonden',
}

function EventReports() {
  const { report } = Route.useLoaderData()
  const { event } = workspaceRoute.useLoaderData()

  function exportSalesCsv() {
    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    downloadCsv(`verkooprapport-${safeTitle}.csv`, [
      ['Ticketsoort', 'Capaciteit', 'Verkocht'],
      ...report.ticketTypes.map((type) => [
        type.name,
        type.capacity,
        type.sold,
      ]),
    ])
  }

  const totalCapacity = report.ticketTypes.reduce(
    (sum, type) => sum + type.capacity,
    0,
  )
  const totalSold = report.ticketTypes.reduce((sum, type) => sum + type.sold, 0)
  const capacityPct =
    totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0
  const validCheckIns = report.checkIns.Valid

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Omzet" value={formatSrd(report.revenueCents)} />
        <StatCard label="Tickets verkocht" value={totalSold} />
        <StatCard label="Capaciteit" value={`${capacityPct}%`} />
        <StatCard label="Check-ins geldig" value={validCheckIns} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Check-ins</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(CHECK_IN_LABELS).map(([result, label]) => (
            <div key={result} className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {report.checkIns[result as keyof typeof report.checkIns]}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticketverkoop per type</CardTitle>
        </CardHeader>
        <CardContent>
          {report.ticketTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Er zijn nog geen tickettypes voor dit event.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.ticketTypes.map((type) => {
                const pct =
                  type.capacity > 0
                    ? Math.min(
                        100,
                        Math.round((type.sold / type.capacity) * 100),
                      )
                    : 0
                return (
                  <li key={type.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{type.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {type.sold} / {type.capacity} verkocht
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full bg-primary')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold">Exporteren</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download je gegevens als CSV.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExportCard
            title="Verkooprapport"
            description="Ticketsoorten met capaciteit en verkochte aantallen."
            onDownload={exportSalesCsv}
          />
          <ExportCard
            title="Bezoekerslijst"
            description="Namen, e-mails en ticketsoort voor de deur."
          />
          <ExportCard
            title="Betaalmethoden"
            description="Verdeling over Mope, Uni5Pay en bank."
          />
          <ExportCard
            title="Scanrapport"
            description="Check-ins per uur, beschikbaar na het evenement."
          />
        </div>
      </div>
    </div>
  )
}

function ExportCard({
  title,
  description,
  onDownload,
}: {
  title: string
  description: string
  onDownload?: () => void
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {onDownload ? (
          <Button variant="outline" size="sm" onClick={onDownload}>
            Download CSV
          </Button>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground">
            Binnenkort
          </span>
        )}
      </CardContent>
    </Card>
  )
}
