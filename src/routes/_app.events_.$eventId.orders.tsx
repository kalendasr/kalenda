import { createFileRoute } from '@tanstack/react-router'
import { Inbox } from 'lucide-react'

import { listEventOrders } from '#/server/orders.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Card } from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/orders')({
  loader: async ({ params }) => ({
    orders: await listEventOrders({ data: { eventId: params.eventId } }),
  }),
  component: EventOrders,
})

function EventOrders() {
  const { orders } = Route.useLoaderData()

  if (orders.length === 0) {
    return (
      <Card className="items-center gap-4 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </span>
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold">Nog geen bestellingen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zodra bezoekers tickets bestellen, verschijnen ze hier. Betalingen
            bevestigen kan straks in de volgende fase.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const status = effectiveOrderStatus(order)
        const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0)
        return (
          <li
            key={order.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {order.customer.firstName} {order.customer.lastName}
                </span>
                <Badge variant={orderStatusBadgeVariant(status)}>
                  {ORDER_STATUS_LABELS[status]}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-mono">{order.orderNumber}</span>
                <span>
                  {tickets} {tickets === 1 ? 'ticket' : 'tickets'}
                </span>
                <span>
                  {order.paymentMethod === 'WhatsApp'
                    ? `WhatsApp${order.paymentApp ? ` · ${order.paymentApp}` : ''}`
                    : 'Bankoverschrijving'}
                </span>
                <span>{formatDateTimeNl(order.createdAt)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold tabular-nums">
                {formatSrd(order.totalCents)}
              </div>
              <a
                href={`tel:${order.customer.phone}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {order.customer.phone}
              </a>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
