import type { ComponentType } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, FileSpreadsheet } from 'lucide-react'

import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import {
  deriveOrderStage,
  ORDER_STAGE_LABELS,
  orderStageBadgeVariant,
} from '#/lib/order-stage.ts'
import { effectiveOrderStatus } from '#/lib/order-status.ts'
import { getDashboardStats, listRecentOrders } from '#/server/dashboard.ts'
import { listMyEventsSummary } from '#/server/event.ts'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'

export const Route = createFileRoute('/_app/dashboard')({
  loader: async () => {
    const [stats, recentOrders, events] = await Promise.all([
      getDashboardStats(),
      listRecentOrders(),
      listMyEventsSummary(),
    ])
    return { stats, recentOrders, events }
  },
  component: Dashboard,
})

type RecentOrder = Awaited<ReturnType<typeof listRecentOrders>>[number]
type EventSummary = Awaited<ReturnType<typeof listMyEventsSummary>>[number]

type ActionItem = {
  id: string
  title: string
  meta: string
  cta: string
  to: string
  params?: Record<string, string>
}

const fullDate = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function Dashboard() {
  const { user, organization } = Route.useRouteContext()
  const { stats, recentOrders, events } = Route.useLoaderData()

  const firstName = user.name.split(' ')[0] ?? user.name

  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0)
  const capacityPct =
    totalCapacity > 0
      ? Math.round((stats.ticketsSold / totalCapacity) * 100)
      : 0

  const draftEvent = events.find((e) => e.status === 'Draft')
  const reviewOrder = recentOrders.find(
    (o) => effectiveOrderStatus(o) === 'AwaitingReview',
  )

  const actions: Array<ActionItem> = []
  if (stats.openPayments > 0) {
    actions.push({
      id: 'payments',
      title: `${stats.openPayments} ${stats.openPayments === 1 ? 'betaling wacht' : 'betalingen wachten'} op controle`,
      meta: 'Controleer het betaalbewijs en geef de tickets vrij.',
      cta: 'Controleren',
      to: reviewOrder ? '/events/$eventId/orders' : '/events',
      params: reviewOrder ? { eventId: reviewOrder.event.id } : undefined,
    })
  }
  if (draftEvent) {
    actions.push({
      id: 'draft',
      title: `${draftEvent.title} staat nog op concept`,
      meta: 'Maak de details en ticketsoorten af om te publiceren.',
      cta: 'Afmaken',
      to: '/events/$eventId/details',
      params: { eventId: draftEvent.id },
    })
  }
  if (!organization.isVerified) {
    actions.push({
      id: 'verify',
      title: 'Organisatie nog niet geverifieerd',
      meta: 'Nodig om kaartbetalingen en automatische uitbetalingen te activeren.',
      cta: 'Verifiëren',
      to: '/organization/settings',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
            Welkom, {firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {organization.name} · {fullDate.format(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/events">Evenementen</Link>
          </Button>
          <Button asChild>
            <Link to="/events/new">Nieuw evenement</Link>
          </Button>
        </div>
      </header>

      {actions.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-200/70 px-5 py-4 dark:border-amber-900/40">
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
              Vraagt je aandacht
            </h2>
            <Badge className="border-transparent bg-amber-200/70 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {actions.length} {actions.length === 1 ? 'actie' : 'acties'}
            </Badge>
            <span className="ms-auto text-sm font-medium text-amber-700/80 dark:text-amber-300/70">
              Werk deze eerst af
            </span>
          </div>
          <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/30">
            {actions.map((action, index) => (
              <li
                key={action.id}
                className="flex flex-wrap items-center gap-4 px-5 py-3.5"
              >
                <span className="font-eyebrow flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-background text-xs text-amber-700 dark:border-amber-900/50 dark:text-amber-300">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {action.meta}
                  </span>
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to={action.to} params={action.params as never}>
                    {action.cta}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Omzet" value={formatSrd(stats.revenueCents)} />
        <StatCard
          label="Tickets verkocht"
          value={stats.ticketsSold}
          subtext={
            totalCapacity > 0 ? `${capacityPct}% van je capaciteit` : undefined
          }
        />
        <StatCard
          label="Nieuwe orders"
          value={stats.newOrders}
          subtext="Wacht op betaling"
        />
        <StatCard
          label="Open betalingen"
          value={stats.openPayments}
          subtext={stats.openPayments > 0 ? 'Wacht op controle' : undefined}
          tone="warning"
        />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recente orders</CardTitle>
            <CardDescription>
              De laatste bestellingen over al je evenementen.
            </CardDescription>
            {recentOrders.length > 0 ? (
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/events">Alle orders</Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col divide-y px-0">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))
            ) : (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Zodra iemand een ticket bestelt, verschijnt de order hier.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Je evenementen</CardTitle>
              <CardDescription>Verkoop per evenement.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y px-0">
              {events.length > 0 ? (
                events
                  .slice(0, 4)
                  .map((event) => <MiniEventRow key={event.id} event={event} />)
              ) : (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Nog geen evenementen.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snel naar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y px-0">
              <Shortcut
                tag="ORG"
                to="/organization/details"
                title="Organisatiegegevens"
                sub="Naam, contact, branding en socials"
              />
              <Shortcut
                tag="PAY"
                to="/organization/payments"
                title="Betaalinstellingen"
                sub="WhatsApp, Mope, Uni5Pay en bank"
              />
              <Shortcut
                tag="CSV"
                icon={FileSpreadsheet}
                to="/organization"
                title="Rapportages"
                sub="Verkoop en bezoekerslijsten exporteren"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RecentOrderRow({ order }: { order: RecentOrder }) {
  const tickets = order.items.flatMap((i) => i.tickets)
  const stage = deriveOrderStage({
    orderStatus: order.orderStatus,
    expiresAt: order.expiresAt,
    paymentMethod: order.paymentMethod,
    payment: order.payment,
    ticketsSent: tickets.length > 0 && tickets.every((t) => Boolean(t.sentAt)),
  })

  return (
    <Link
      to="/events/$eventId/orders"
      params={{ eventId: order.event.id }}
      className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0">
        <span className="font-semibold">
          {order.customer.firstName} {order.customer.lastName}
        </span>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {order.event.title}
          <span className="mx-1.5 opacity-40">·</span>
          {formatDateTimeShortNl(order.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={orderStageBadgeVariant(stage)}>
          {ORDER_STAGE_LABELS[stage]}
        </Badge>
        <span className="font-semibold tabular-nums">
          {formatSrd(order.totalCents)}
        </span>
      </div>
    </Link>
  )
}

function MiniEventRow({ event }: { event: EventSummary }) {
  const pct =
    event.capacity > 0
      ? Math.min(100, Math.round((event.sold / event.capacity) * 100))
      : 0

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="block px-6 py-3.5 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold">{event.title}</span>
        <EventStatusBadge
          status={event.status}
          startsAt={event.startsAt}
          endsAt={event.endsAt}
        />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-medium text-muted-foreground">
        <span>
          {event.capacity > 0
            ? `${event.sold} van ${event.capacity} tickets`
            : 'Nog niet in verkoop'}
        </span>
        <span>{formatSrd(event.revenueCents)}</span>
      </div>
    </Link>
  )
}

function Shortcut({
  tag,
  title,
  sub,
  to,
  icon: Icon,
}: {
  tag: string
  title: string
  sub: string
  to: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent"
    >
      <span className="font-eyebrow flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-medium text-primary">
        {Icon ? <Icon className="size-4" /> : tag}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {sub}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
