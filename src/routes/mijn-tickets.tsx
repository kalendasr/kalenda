import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowRight, Ticket } from 'lucide-react'

import { listMyOrders } from '#/server/orders.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'
import {
  AppErrorPage,
  StorefrontPendingState,
} from '#/components/app/full-page-states.tsx'

export const Route = createFileRoute('/mijn-tickets')({
  head: () => ({
    meta: [{ title: 'Mijn tickets · Kalenda' }],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: { redirect: '/mijn-tickets' },
      })
    }
  },
  loader: () => listMyOrders(),
  component: MijnTickets,
  pendingComponent: () => <StorefrontPendingState cards={2} />,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage error={error} reset={reset} />
  ),
})

function MijnTickets() {
  const orders = Route.useLoaderData()

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Mijn tickets</h1>
        <p className="mt-1 text-muted-foreground">
          Al je bestellingen op één plek.
        </p>

        {orders.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Ticket className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-4 font-medium">Je hebt nog geen tickets</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Zodra je een ticket koopt, verschijnt je bestelling hier.
            </p>
            <Button asChild className="mt-5">
              <Link to="/evenementen">Bekijk evenementen</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {orders.map((order) => {
              const status = effectiveOrderStatus(order)
              const ticketCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              )

              return (
                <li key={order.id}>
                  <Link
                    to="/bestelling/$orderNumber"
                    params={{ orderNumber: order.orderNumber }}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {order.event.title}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {formatDateNl(order.event.startsAt)}
                        {order.event.venue
                          ? ` · ${order.event.venue.name}`
                          : ''}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
                      </div>
                    </div>
                    <Badge variant={orderStatusBadgeVariant(status)}>
                      {ORDER_STATUS_LABELS[status]}
                    </Badge>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
