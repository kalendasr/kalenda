import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays, Receipt, UserPlus } from 'lucide-react'

import { getPlatformActivity, getPlatformStats } from '#/server/admin/stats.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl, formatDateTimeShortNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import { USER_ROLE_LABELS, userRoleBadgeVariant } from '#/lib/admin-labels.ts'
import { StatCard } from '#/components/app/stat-card.tsx'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_admin/admin/')({
  loader: async () => {
    const [stats, activity] = await Promise.all([
      getPlatformStats(),
      getPlatformActivity(),
    ])
    return { stats, activity }
  },
  component: AdminOverview,
  pendingComponent: () => <RoutePendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const ORDER_STATUS_ORDER = [
  'PendingPayment',
  'AwaitingReview',
  'Paid',
  'Completed',
  'Cancelled',
  'Expired',
] as const

function AdminOverview() {
  const { user } = Route.useRouteContext()
  const { stats, activity } = Route.useLoaderData()
  const firstName = user.name.split(' ')[0] ?? user.name

  const checkInRate =
    stats.ticketsIssued === 0
      ? 0
      : Math.round((stats.ticketsCheckedIn / stats.ticketsIssued) * 100)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Platformoverzicht"
        description={`Welkom, ${firstName} — dit is wat er nu op het platform gebeurt.`}
      />

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
              : `${stats.customers} klantprofielen`
          }
          tone={stats.blockedUsers > 0 ? 'danger' : 'default'}
          href="/admin/users"
        />
        <StatCard
          label="Tickets uitgegeven"
          value={stats.ticketsIssued}
          subtext={`${checkInRate}% ingecheckt`}
          href="/admin/tickets"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bestellingen per status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {ORDER_STATUS_ORDER.map((status) => (
              <div
                key={status}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">
                  {ORDER_STATUS_LABELS[status]}
                </span>
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
              Uitsluitend betaalde en afgeronde bestellingen. Geannuleerde en
              verlopen bestellingen tellen niet mee. Het platform verwerkt zelf
              geen betalingen — dit cijfer is informatief.
            </p>
            <Link
              to="/admin/reports"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Bekijk rapportages
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <RecentCard
          title="Recente bestellingen"
          icon={Receipt}
          href="/admin/orders"
          empty="Zodra er besteld wordt, verschijnt het hier."
          items={activity.recentOrders.map((order) => {
            const status = effectiveOrderStatus({
              orderStatus: order.orderStatus,
              expiresAt: order.expiresAt,
            })
            return {
              key: order.id,
              to: '/admin/orders/$orderNumber',
              params: { orderNumber: order.orderNumber },
              primary: `${order.customer.firstName} ${order.customer.lastName}`,
              secondary: order.event.title,
              meta: formatSrd(order.totalCents),
              badge: (
                <Badge variant={orderStatusBadgeVariant(status)}>
                  {ORDER_STATUS_LABELS[status]}
                </Badge>
              ),
            }
          })}
        />

        <RecentCard
          title="Nieuwe registraties"
          icon={UserPlus}
          href="/admin/users"
          empty="Nieuwe accounts verschijnen hier zodra iemand zich registreert."
          items={activity.recentUsers.map((account) => {
            const role = account.isPlatformAdmin
              ? 'platformAdmin'
              : account.organization
                ? 'organizer'
                : 'customer'
            return {
              key: account.id,
              to: '/admin/users/$userId',
              params: { userId: account.id },
              primary: account.name,
              secondary: account.email,
              meta: formatDateNl(account.createdAt),
              badge: (
                <Badge variant={userRoleBadgeVariant(role)}>
                  {USER_ROLE_LABELS[role]}
                </Badge>
              ),
            }
          })}
        />

        <RecentCard
          title="Nieuwe evenementen"
          icon={CalendarDays}
          href="/admin/events"
          empty="Zodra organisatoren evenementen aanmaken, staan ze hier."
          items={activity.recentEvents.map((event) => ({
            key: event.id,
            to: '/admin/events/$eventId',
            params: { eventId: event.id },
            primary: event.title,
            secondary: event.organization.name,
            meta: formatDateTimeShortNl(event.startsAt),
            badge: (
              <EventStatusBadge
                status={event.status}
                startsAt={event.startsAt}
                endsAt={event.endsAt}
              />
            ),
          }))}
        />
      </section>
    </div>
  )
}

type RecentItem = {
  key: string
  to: string
  params: Record<string, string>
  primary: string
  secondary: string
  meta: string
  badge: React.ReactNode
}

function RecentCard({
  title,
  icon: Icon,
  href,
  items,
  empty,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  items: Array<RecentItem>
  empty: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <Link
          to={href}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Alles
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              params={item.params}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {item.primary}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.secondary}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {item.badge}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.meta}
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
