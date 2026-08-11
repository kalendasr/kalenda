import { useMemo, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Inbox } from 'lucide-react'

import { listEventOrders } from '#/server/orders.ts'
import {
  approvePayment,
  getProofSignedUrl,
  rejectPayment,
  sendPaymentRequest,
} from '#/server/payments.ts'
import type { ApprovePaymentResult } from '#/server/payments.ts'
import {
  markTicketsSharedViaWhatsApp,
  resendOrderTickets,
  shareTicketsViaWhatsApp,
} from '#/server/tickets.ts'
import { sendCustomerMessagePush } from '#/server/notifications.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { effectiveOrderStatus } from '#/lib/order-status.ts'
import {
  deriveOrderStage,
  ORDER_STAGE_LABELS,
  orderStageBadgeVariant,
} from '#/lib/order-stage.ts'
import type { OrderStage } from '#/lib/order-stage.ts'
import { cn } from '#/lib/utils.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { OrderDetailDialog } from '#/components/app/order-detail-dialog.tsx'
import { PaymentConfirmedDialog } from '#/components/app/payment-confirmed-dialog.tsx'
import { toast } from '#/components/ui/sonner.tsx'
import { errorMessage } from '#/lib/error-message.ts'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/orders')({
  loader: async ({ params }) => ({
    orders: await listEventOrders({ data: { eventId: params.eventId } }),
  }),
  component: EventOrders,
  pendingComponent: () => <RoutePendingState />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

type OrdersResult = Awaited<ReturnType<typeof listEventOrders>>
type OrderRow = OrdersResult[number]

const ORDER_FILTERS: Array<{
  label: string
  stages: Array<OrderStage> | null
}> = [
  { label: 'Alle', stages: null },
  {
    label: 'Actie nodig',
    stages: ['NewOrder', 'ProofSubmitted', 'TicketsPending'],
  },
  { label: 'Afgerond', stages: ['Done'] },
  { label: 'Verlopen', stages: ['Expired', 'Cancelled'] },
]

function stageOf(order: OrderRow): OrderStage {
  const tickets = order.items.flatMap((i) => i.tickets)
  return deriveOrderStage({
    orderStatus: order.orderStatus,
    expiresAt: order.expiresAt,
    paymentMethod: order.paymentMethod,
    payment: order.payment,
    ticketsSent: tickets.length > 0 && tickets.every((t) => Boolean(t.sentAt)),
  })
}

function EventOrders() {
  const { orders } = Route.useLoaderData()
  const { eventId } = Route.useParams()
  const router = useRouter()
  const [filter, setFilter] = useState('Alle')
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<ApprovePaymentResult | null>(null)

  const stats = useMemo(() => {
    let doneCount = 0
    let doneSum = 0
    let actionCount = 0
    let expiredCount = 0
    for (const order of orders) {
      const stage = stageOf(order)
      if (stage === 'Done') {
        doneCount++
        doneSum += order.totalCents
      } else if (
        stage === 'NewOrder' ||
        stage === 'ProofSubmitted' ||
        stage === 'TicketsPending'
      ) {
        actionCount++
      } else if (stage === 'Expired') {
        expiredCount++
      }
    }
    return {
      doneCount,
      doneSum,
      actionCount,
      expiredCount,
      avg: doneCount > 0 ? Math.round(doneSum / doneCount) : 0,
    }
  }, [orders])

  const visible = useMemo(() => {
    const active = ORDER_FILTERS.find((f) => f.label === filter)
    if (!active?.stages) return orders
    return orders.filter((o) => active.stages!.includes(stageOf(o)))
  }, [orders, filter])

  const openOrder = orders.find((o) => o.id === openOrderId) ?? null

  async function runAction(
    fn: () => Promise<{ whatsappUrl?: string | null } | unknown>,
    success: string,
  ) {
    try {
      const result = await fn()
      if (
        result &&
        typeof result === 'object' &&
        'whatsappUrl' in result &&
        (result as { whatsappUrl?: string | null }).whatsappUrl
      ) {
        window.open(
          (result as { whatsappUrl: string }).whatsappUrl,
          '_blank',
          'noopener',
        )
      }
      await router.invalidate()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error, 'Actie is niet gelukt.'))
    }
  }

  // Aparte handler naast `runAction`: het resultaat van `approvePayment` is nu
  // rijk (tickets/mail/push/WhatsApp-link) en wordt getoond in
  // `PaymentConfirmedDialog` in plaats van een toast — `runAction` zou de
  // whatsappUrl bovendien meteen openen, wat hier ongewenst is (de
  // organisator klikt zelf op de knop in de popup).
  async function approveAndConfirm(orderId: string) {
    try {
      const result = await approvePayment({ data: { orderId } })
      setOpenOrderId(null)
      setConfirmed(result)
      await router.invalidate()
    } catch (error) {
      toast.error(errorMessage(error, 'Actie is niet gelukt.'))
    }
  }

  if (orders.length === 0) {
    return (
      <Card className="items-center gap-4 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </span>
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold">Nog geen bestellingen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zodra bezoekers tickets bestellen, verschijnen ze hier. Je kunt de
            betaling bevestigen zodra je geld hebt ontvangen.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Afgerond"
          value={stats.doneCount}
          subtext={formatSrd(stats.doneSum)}
          tone="success"
        />
        <StatCard
          label="Actie nodig"
          value={stats.actionCount}
          tone={stats.actionCount > 0 ? 'warning' : undefined}
        />
        <StatCard
          label="Verlopen"
          value={stats.expiredCount}
          subtext={
            stats.expiredCount > 0 ? 'Automatisch vrijgegeven' : undefined
          }
        />
        <StatCard label="Gem. besteedbedrag" value={formatSrd(stats.avg)} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {ORDER_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.label)}
              aria-pressed={filter === f.label}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                filter === f.label
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ms-auto">
          <Button variant="outline" size="sm" asChild>
            <Link to="/events/$eventId/reports" params={{ eventId }}>
              Exporteren
            </Link>
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Geen orders in deze categorie.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpen={() => setOpenOrderId(order.id)}
              onApprove={() => approveAndConfirm(order.id)}
              onSendPaymentRequest={() =>
                runAction(
                  () => sendPaymentRequest({ data: { orderId: order.id } }),
                  'Betaalverzoek verstuurd.',
                )
              }
              onResend={() =>
                runAction(
                  () => resendOrderTickets({ data: { orderId: order.id } }),
                  'Tickets zijn verstuurd.',
                )
              }
            />
          ))}
        </ul>
      )}

      {openOrder ? (
        <OrderDetailDialog
          order={openOrder}
          open={Boolean(openOrder)}
          onOpenChange={(next) => {
            if (!next) setOpenOrderId(null)
          }}
          onApprove={() => approveAndConfirm(openOrder.id)}
          onReject={(notes) =>
            runAction(
              () => rejectPayment({ data: { orderId: openOrder.id, notes } }),
              'Betaling afgekeurd. De klant is op de hoogte gesteld.',
            )
          }
          onSendPaymentRequest={() =>
            runAction(
              () => sendPaymentRequest({ data: { orderId: openOrder.id } }),
              'Betaalverzoek verstuurd.',
            )
          }
          onResendEmail={() =>
            runAction(
              () => resendOrderTickets({ data: { orderId: openOrder.id } }),
              'Tickets zijn gemaild.',
            )
          }
          onShareWhatsApp={() =>
            runAction(
              () =>
                shareTicketsViaWhatsApp({ data: { orderId: openOrder.id } }),
              'WhatsApp geopend met de ticketlink.',
            )
          }
          onViewProof={async () => {
            try {
              const result = await getProofSignedUrl({
                data: { orderId: openOrder.id },
              })
              if (result?.url) {
                window.open(result.url, '_blank', 'noopener')
              } else {
                toast.error('Er is geen betaalbewijs gevonden.')
              }
            } catch (error) {
              toast.error(errorMessage(error, 'Bewijs ophalen is mislukt.'))
            }
          }}
          onSendPush={(title, body) =>
            sendCustomerMessagePush({
              data: { orderId: openOrder.id, title, body },
            }).then((r) => r.delivered)
          }
        />
      ) : null}

      {confirmed ? (
        <PaymentConfirmedDialog
          result={confirmed}
          open={Boolean(confirmed)}
          onOpenChange={(next) => {
            if (!next) setConfirmed(null)
          }}
          onResendEmail={async () => {
            try {
              await resendOrderTickets({ data: { orderId: confirmed.orderId } })
              toast.success('Tickets zijn gemaild.')
              await router.invalidate()
            } catch (error) {
              toast.error(errorMessage(error, 'Mailen is mislukt.'))
            }
          }}
          onSendPush={(title, body) =>
            sendCustomerMessagePush({
              data: { orderId: confirmed.orderId, title, body },
            }).then((r) => r.delivered)
          }
          onWhatsAppOpened={() => {
            markTicketsSharedViaWhatsApp({
              data: { orderId: confirmed.orderId },
            })
              .then(() => router.invalidate())
              .catch(() => {
                // Stil: de organisator heeft het gesprek al geopend; het
                // leveringskanaal bijwerken is best-effort en niet zichtbaar
                // in deze popup.
              })
          }}
        />
      ) : null}
    </div>
  )
}

function OrderCard({
  order,
  onOpen,
  onApprove,
  onSendPaymentRequest,
  onResend,
}: {
  order: OrderRow
  onOpen: () => void
  onApprove: () => Promise<void>
  onSendPaymentRequest: () => Promise<void>
  onResend: () => Promise<void>
}) {
  const status = effectiveOrderStatus(order)
  const stage = stageOf(order)
  const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const issuedTickets = order.items.reduce(
    (sum, i) => sum + i.tickets.length,
    0,
  )
  const isWhatsApp = order.paymentMethod === 'WhatsApp'

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {order.customer.firstName} {order.customer.lastName}
          </span>
          <Badge variant={orderStageBadgeVariant(stage)}>
            {ORDER_STAGE_LABELS[stage]}
          </Badge>
          {issuedTickets > 0 ? (
            <span className="text-xs text-muted-foreground">
              · {issuedTickets} ticket{issuedTickets === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-eyebrow">{order.orderNumber}</span>
          <span>
            {tickets} {tickets === 1 ? 'ticket' : 'tickets'}
          </span>
          <span>
            {isWhatsApp
              ? `WhatsApp${order.paymentApp ? ` · ${order.paymentApp}` : ''}`
              : 'Bankoverschrijving'}
          </span>
          <span>{formatDateTimeNl(order.createdAt)}</span>
        </div>
      </button>

      <div className="flex flex-col items-end gap-2">
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

        {stage === 'NewOrder' && status !== 'Expired' ? (
          <Button size="sm" onClick={onSendPaymentRequest}>
            Betaalverzoek versturen
          </Button>
        ) : null}

        {(stage === 'PaymentRequested' || stage === 'AwaitingTransfer') &&
        status !== 'Expired' ? (
          <ApproveDialog order={order} onApprove={onApprove} />
        ) : null}

        {stage === 'ProofSubmitted' ? (
          <Button size="sm" variant="outline" onClick={onOpen}>
            Bewijs controleren
          </Button>
        ) : null}

        {(stage === 'TicketsPending' || stage === 'Done') &&
        status !== 'Expired' ? (
          <Button size="sm" variant="outline" onClick={onResend}>
            {stage === 'Done' ? 'Opnieuw versturen' : 'Verstuur tickets'}
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function ApproveDialog({
  order,
  onApprove,
}: {
  order: OrderRow
  onApprove: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0)

  async function confirm() {
    setBusy(true)
    try {
      await onApprove()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Bevestig betaling
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaling bevestigen</DialogTitle>
            <DialogDescription>
              Bevestig dat je {formatSrd(order.totalCents)} hebt ontvangen. We
              maken daarna {tickets} tickets aan en mailen ze naar{' '}
              {order.customer.email}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button disabled={busy} onClick={confirm}>
              {busy ? 'Bezig…' : 'Ja, bevestig betaling'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
