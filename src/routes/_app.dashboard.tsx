import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
} from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import { getDashboardStats, listRecentOrders } from '#/server/dashboard.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'

export const Route = createFileRoute('/_app/dashboard')({
  loader: async () => {
    const [stats, recentOrders] = await Promise.all([
      getDashboardStats(),
      listRecentOrders(),
    ])
    return { stats, recentOrders }
  },
  component: Dashboard,
})

type RecentOrder = Awaited<ReturnType<typeof listRecentOrders>>[number]

type SetupStep = {
  id: string
  label: string
  description: string
  to: string
  done: boolean
}

function Dashboard() {
  const { user, organization } = Route.useRouteContext()
  const { stats, recentOrders } = Route.useLoaderData()

  const hasContact = Boolean(
    organization.email || organization.phone || organization.description,
  )
  const hasPaymentMethod = Boolean(
    organization.paymentSettings?.whatsappEnabled ||
    organization.paymentSettings?.bankEnabled,
  )

  const steps: Array<SetupStep> = [
    {
      id: 'general',
      label: 'Vul je organisatiegegevens aan',
      description: 'Beschrijving en contactgegevens die bezoekers zien.',
      to: '/organization/general',
      done: hasContact,
    },
    {
      id: 'payments',
      label: 'Stel een betaalmethode in',
      description: 'WhatsApp-betaalverzoek of bankoverschrijving.',
      to: '/organization/payments',
      done: hasPaymentMethod,
    },
  ]

  const remaining = steps.filter((step) => !step.done)
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welkom, {firstName}
        </h1>
        <p className="text-muted-foreground">{organization.name}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Nieuwe orders" value={stats.newOrders} />
        <StatCard
          label="Open betalingen"
          value={stats.openPayments}
          subtext={stats.openPayments > 0 ? 'Wacht op controle' : undefined}
          tone="warning"
        />
        <StatCard
          label="Open acties"
          value={stats.openActions}
          subtext={stats.openActions > 0 ? 'Vraagt aandacht' : undefined}
          tone="danger"
        />
        <StatCard label="Omzet" value={formatSrd(stats.revenueCents)} />
        <StatCard label="Tickets verkocht" value={stats.ticketsSold} />
      </section>

      {recentOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recente orders</CardTitle>
            <CardDescription>
              De laatste bestellingen over al je evenementen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y px-0">
            {recentOrders.map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {remaining.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rond je instellingen af</CardTitle>
            <CardDescription>
              Nog {remaining.length}{' '}
              {remaining.length === 1 ? 'stap' : 'stappen'} voordat je klaar
              bent om evenementen te publiceren.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {steps.map((step) => (
              <Link
                key={step.id}
                to={step.to}
                className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      step.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                {!step.done ? (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Je organisatie is klaar
            </CardTitle>
            <CardDescription>
              Je gegevens en betaalmethode staan ingesteld. Hierboven zie je een
              overzicht van je evenementen.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          to="/organization/general"
          icon={Building2}
          title="Organisatiegegevens"
          description="Naam, beschrijving, contact en sociale media."
        />
        <QuickLink
          to="/organization/payments"
          icon={CreditCard}
          title="Betaalinstellingen"
          description="WhatsApp en bankoverschrijving beheren."
        />
      </section>
    </div>
  )
}

function RecentOrderRow({ order }: { order: RecentOrder }) {
  const status = effectiveOrderStatus(order)

  return (
    <Link
      to="/events/$eventId/orders"
      params={{ eventId: order.event.id }}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {order.customer.firstName} {order.customer.lastName}
          </span>
          <Badge variant={orderStatusBadgeVariant(status)}>
            {ORDER_STATUS_LABELS[status]}
          </Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{order.event.title}</span>
          <span>{formatDateTimeNl(order.createdAt)}</span>
        </div>
      </div>
      <div className="font-semibold tabular-nums">
        {formatSrd(order.totalCents)}
      </div>
    </Link>
  )
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  )
}
