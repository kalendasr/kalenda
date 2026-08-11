import { createFileRoute } from '@tanstack/react-router'

import { getPlatformStats } from '#/server/admin.ts'
import { formatSrd } from '#/lib/money.ts'
import { StatCard } from '#/components/app/stat-card.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_admin/admin/')({
  loader: async () => ({ stats: await getPlatformStats() }),
  component: AdminOverview,
})

const ORDER_STATUS_LABELS: Record<string, string> = {
  PendingPayment: 'Wacht op betaling',
  AwaitingReview: 'Ter controle',
  Paid: 'Betaald',
  Completed: 'Afgerond',
  Cancelled: 'Geannuleerd',
  Expired: 'Verlopen',
}

function AdminOverview() {
  const { user } = Route.useRouteContext()
  const { stats } = Route.useLoaderData()
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          Platformoverzicht
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welkom, {firstName} — dit is wat er nu op het platform gebeurt.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Organisaties"
          value={stats.activeOrganizations}
          subtext={
            stats.organizations > stats.activeOrganizations
              ? `${stats.organizations - stats.activeOrganizations} gedeactiveerd`
              : 'Allemaal actief'
          }
          tone={
            stats.organizations > stats.activeOrganizations
              ? 'warning'
              : 'default'
          }
          href="/admin/organizations"
        />
        <StatCard
          label="Evenementen"
          value={stats.events}
          subtext={`${stats.publishedEvents} gepubliceerd`}
          href="/admin/events"
        />
        <StatCard
          label="Gebruikers"
          value={stats.users}
          subtext={
            stats.blockedUsers > 0
              ? `${stats.blockedUsers} geblokkeerd`
              : undefined
          }
          tone={stats.blockedUsers > 0 ? 'danger' : 'default'}
          href="/admin/users"
        />
        <StatCard label="Tickets uitgegeven" value={stats.ticketsIssued} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders per status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
              <div
                key={status}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-bold tabular-nums">
                  {stats.ordersByStatus[status] ?? 0}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm font-semibold">Totaal</span>
              <span className="text-sm font-bold tabular-nums">
                {stats.orders}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verkoopvolume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[26px] font-extrabold tracking-[-0.025em] tabular-nums">
              {formatSrd(stats.salesVolumeCents)}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Som van betaalde en afgeronde orders. Het platform verwerkt zelf
              geen betalingen — dit is uitsluitend informatief.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
