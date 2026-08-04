import { createFileRoute } from '@tanstack/react-router'

import { getEventReport } from '#/server/reports.ts'
import { formatSrd } from '#/lib/money.ts'
import { cn } from '#/lib/utils.ts'
import { StatCard } from '#/components/app/stat-card.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/reports')({
  loader: async ({ params }) => ({
    report: await getEventReport({ data: { eventId: params.eventId } }),
  }),
  component: EventReports,
})

const CHECK_IN_LABELS: Record<string, string> = {
  Valid: 'Geldig',
  AlreadyCheckedIn: 'Al ingecheckt',
  Invalid: 'Ongeldig',
  NotFound: 'Niet gevonden',
}

function EventReports() {
  const { report } = Route.useLoaderData()

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
    </div>
  )
}
