import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CheckCircle2, CircleAlert } from 'lucide-react'

import { getEventReport } from '#/server/reports.ts'
import { listEventOrders } from '#/server/orders.ts'
import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  deriveOrderStage,
  ORDER_STAGE_LABELS,
  orderStageBadgeVariant,
} from '#/lib/order-stage.ts'
import { effectiveOrderStatus } from '#/lib/order-status.ts'
import { cn } from '#/lib/utils.ts'
import { PanelEmpty } from '#/components/app/empty-state.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/')({
  loader: async ({ params }) => {
    const [report, orders] = await Promise.all([
      getEventReport({ data: { eventId: params.eventId } }),
      listEventOrders({ data: { eventId: params.eventId } }),
    ])
    return { report, orders }
  },
  component: EventOverview,
  pendingComponent: () => <RoutePendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

function EventOverview() {
  const { event } = workspaceRoute.useLoaderData()
  const { report, orders } = Route.useLoaderData()

  const sold = report.ticketTypes.reduce((sum, t) => sum + t.sold, 0)
  const capacity = report.ticketTypes.reduce((sum, t) => sum + t.capacity, 0)
  const openPayments = orders.filter(
    (o) => effectiveOrderStatus(o) === 'AwaitingReview',
  ).length
  const scanned = report.checkIns.Valid

  const readiness = eventPublishReadiness(
    { ...event, ticketTypeCount: event.ticketTypes.length },
    event.organization.paymentSettings,
  )
  const detailsDone = !readiness.missing.some((m) =>
    ['title', 'description', 'startsAt', 'category', 'venue', 'cover'].includes(
      m.key,
    ),
  )

  const checklist: Array<{
    title: string
    done: boolean
    cta?: { label: string; to: string }
  }> = [
    {
      title: 'Details en flyer compleet',
      done: detailsDone,
      cta: detailsDone
        ? undefined
        : { label: 'Naar details', to: '/events/$eventId/details' },
    },
    {
      title: 'Ticketsoorten in verkoop',
      done: event.ticketTypes.length > 0,
      cta:
        event.ticketTypes.length > 0
          ? undefined
          : { label: 'Naar tickets', to: '/events/$eventId/tickets' },
    },
    {
      title:
        openPayments > 0
          ? `${openPayments} ${openPayments === 1 ? 'betaling' : 'betalingen'} nog niet gecontroleerd`
          : 'Alle betalingen gecontroleerd',
      done: openPayments === 0,
      cta:
        openPayments > 0
          ? { label: 'Naar orders', to: '/events/$eventId/orders' }
          : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <StatusBanner status={event.status} eventId={event.id} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Omzet" value={formatSrd(report.revenueCents)} />
        <StatCard
          label="Verkocht"
          value={capacity > 0 ? `${sold} / ${capacity}` : String(sold)}
        />
        <StatCard
          label="Open betalingen"
          value={openPayments}
          subtext={openPayments > 0 ? 'Wacht op controle' : undefined}
          tone="warning"
        />
        <StatCard
          label="Gescand"
          value={scanned}
          subtext={scanned === 0 ? 'Scanner start op de avond zelf' : undefined}
        />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voor de deuren opengaan</CardTitle>
            <CardDescription>
              Wat er nog open staat voor dit evenement.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y px-0">
            {checklist.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 px-6 py-3"
              >
                {item.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <CircleAlert className="size-5 shrink-0 text-warning" />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm font-medium',
                    item.done && 'text-muted-foreground',
                  )}
                >
                  {item.title}
                </span>
                {item.cta ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.cta.to} params={{ eventId: event.id }}>
                      {item.cta.label}
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Klaar
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laatste orders</CardTitle>
            <CardDescription>{event.title}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y px-0">
            {orders.length > 0 ? (
              orders.slice(0, 5).map((order) => {
                const tickets = order.items.flatMap((i) => i.tickets)
                const stage = deriveOrderStage({
                  orderStatus: order.orderStatus,
                  expiresAt: order.expiresAt,
                  paymentMethod: order.paymentMethod,
                  payment: order.payment,
                  ticketsSent:
                    tickets.length > 0 &&
                    tickets.every((t) => Boolean(t.sentAt)),
                })
                return (
                  <Link
                    key={order.id}
                    to="/events/$eventId/orders"
                    params={{ eventId: event.id }}
                    className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {order.customer.firstName} {order.customer.lastName}
                        </span>
                        <Badge variant={orderStageBadgeVariant(stage)}>
                          {ORDER_STAGE_LABELS[stage]}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDateTimeNl(order.createdAt)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatSrd(order.totalCents)}
                    </span>
                  </Link>
                )
              })
            ) : (
              <PanelEmpty
                title="Nog geen bestellingen"
                description="Zodra iemand tickets bestelt, verschijnt de bestelling hier en kun je de betaling bevestigen."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBanner({
  status,
  eventId,
}: {
  status: 'Draft' | 'Published' | 'Archived'
  eventId: string
}) {
  if (status === 'Published') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Live op kalenda.sr
          </span>
          <span className="block text-sm text-muted-foreground">
            Zichtbaar voor bezoekers.
          </span>
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link to="/events/$eventId/settings" params={{ eventId }}>
            Publicatie beheren
          </Link>
        </Button>
      </div>
    )
  }

  if (status === 'Archived') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CircleAlert className="size-5 shrink-0 text-warning" />
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">
          Dit evenement is gearchiveerd en niet zichtbaar op de website.
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link to="/events/$eventId/settings" params={{ eventId }}>
            Publicatie beheren
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/40 px-5 py-4">
      <CircleAlert className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          Nog niet gepubliceerd
        </span>
        <span className="block text-sm text-muted-foreground">
          Dit evenement staat op concept en is niet zichtbaar op de website.
        </span>
      </span>
      <Button size="sm" asChild>
        <Link to="/events/$eventId/settings" params={{ eventId }}>
          Publiceren
        </Link>
      </Button>
    </div>
  )
}
