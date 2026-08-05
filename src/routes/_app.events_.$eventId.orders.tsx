import { useMemo, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Inbox, Send, X } from 'lucide-react'

import { listEventOrders } from '#/server/orders.ts'
import {
  approvePayment,
  getProofSignedUrl,
  rejectPayment,
} from '#/server/payments.ts'
import { resendOrderTickets } from '#/server/tickets.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import {
  PAYMENT_STATE_LABELS,
  paymentStateBadgeVariant,
} from '#/lib/payment-transitions.ts'
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
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/orders')({
  loader: async ({ params }) => ({
    orders: await listEventOrders({ data: { eventId: params.eventId } }),
  }),
  component: EventOrders,
})

type OrdersResult = Awaited<ReturnType<typeof listEventOrders>>
type OrderRow = OrdersResult[number]

const ORDER_FILTERS: Array<{ label: string; statuses: Array<string> | null }> =
  [
    { label: 'Alle', statuses: null },
    { label: 'Wacht op controle', statuses: ['AwaitingReview'] },
    { label: 'Afgerond', statuses: ['Completed', 'Paid'] },
    { label: 'Verlopen', statuses: ['Expired'] },
  ]

function EventOrders() {
  const { orders } = Route.useLoaderData()
  const { eventId } = Route.useParams()
  const router = useRouter()
  const [filter, setFilter] = useState('Alle')

  const stats = useMemo(() => {
    let doneCount = 0
    let doneSum = 0
    let reviewCount = 0
    let reviewSum = 0
    let expiredCount = 0
    for (const order of orders) {
      const status = effectiveOrderStatus(order)
      if (status === 'Completed' || status === 'Paid') {
        doneCount++
        doneSum += order.totalCents
      } else if (status === 'AwaitingReview') {
        reviewCount++
        reviewSum += order.totalCents
      } else if (status === 'Expired') {
        expiredCount++
      }
    }
    return {
      doneCount,
      doneSum,
      reviewCount,
      reviewSum,
      expiredCount,
      avg: doneCount > 0 ? Math.round(doneSum / doneCount) : 0,
    }
  }, [orders])

  const visible = useMemo(() => {
    const active = ORDER_FILTERS.find((f) => f.label === filter)
    if (!active?.statuses) return orders
    return orders.filter((o) =>
      active.statuses!.includes(effectiveOrderStatus(o)),
    )
  }, [orders, filter])

  async function runAction(
    fn: () => Promise<{ ok: boolean }>,
    success: string,
  ) {
    try {
      await fn()
      await router.invalidate()
      toast.success(success)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Actie is niet gelukt.',
      )
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
          label="Wacht op controle"
          value={stats.reviewCount}
          subtext={
            stats.reviewCount > 0 ? formatSrd(stats.reviewSum) : undefined
          }
          tone="warning"
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
              onApprove={() =>
                runAction(
                  () => approvePayment({ data: { orderId: order.id } }),
                  'Betaling bevestigd.',
                )
              }
              onReject={(notes) =>
                runAction(
                  () =>
                    rejectPayment({
                      data: { orderId: order.id, notes },
                    }),
                  'Betaling afgekeurd.',
                )
              }
              onResend={() =>
                runAction(
                  () => resendOrderTickets({ data: { orderId: order.id } }),
                  'Tickets zijn opnieuw verstuurd.',
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderCard({
  order,
  onApprove,
  onReject,
  onResend,
}: {
  order: OrderRow
  onApprove: () => Promise<void>
  onReject: (notes?: string) => Promise<void>
  onResend: () => Promise<void>
}) {
  const status = effectiveOrderStatus(order)
  const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const issuedTickets = order.items.reduce(
    (sum, i) => sum + i.tickets.length,
    0,
  )
  const pay = order.payment
  const isWhatsApp = order.paymentMethod === 'WhatsApp'
  const showActions =
    pay &&
    (pay.state === 'Waiting' || pay.state === 'Submitted') &&
    status !== 'Expired' &&
    status !== 'Cancelled'
  const canResend = issuedTickets > 0 && status !== 'Expired'

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {order.customer.firstName} {order.customer.lastName}
          </span>
          <Badge variant={orderStatusBadgeVariant(status)}>
            {ORDER_STATUS_LABELS[status]}
          </Badge>
          {pay ? (
            <Badge variant={paymentStateBadgeVariant(pay.state)}>
              {PAYMENT_STATE_LABELS[pay.state]}
            </Badge>
          ) : null}
          {pay?.notes ? (
            <span className="text-xs text-muted-foreground">· {pay.notes}</span>
          ) : null}
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
      </div>

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

        {showActions ? (
          <div className="flex items-center gap-2">
            {!isWhatsApp && pay.state === 'Submitted' && pay.proofKey ? (
              <ProofPreviewButton orderId={order.id} />
            ) : null}
            <Button size="sm" onClick={onApprove}>
              <Check />
              {isWhatsApp ? 'Bevestig betaling' : 'Goedkeuren'}
            </Button>
            <RejectButton onReject={onReject} />
          </div>
        ) : null}

        {canResend ? (
          <Button size="sm" variant="outline" onClick={onResend}>
            <Send />
            Verstuur tickets
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function ProofPreviewButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  async function openProof() {
    try {
      const result = await getProofSignedUrl({
        data: { orderId },
      })
      if (result?.url) {
        setUrl(result.url)
        setOpen(true)
      } else {
        toast.error('Er is geen betaalbewijs gevonden.')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Bewijs ophalen is mislukt.',
      )
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={openProof}>
        Bewijs bekijken
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaalbewijs</DialogTitle>
            <DialogDescription>
              Controleer dit bewijs voordat je de betaling goedkeurt.
            </DialogDescription>
          </DialogHeader>
          {url ? (
            <img
              src={url}
              alt="Betaalbewijs van de klant"
              className="max-h-[60vh] w-full rounded-lg object-contain"
            />
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RejectButton({
  onReject,
}: {
  onReject: (notes?: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await onReject(notes.trim() || undefined)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <X />
        Afkeuren
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaling afkeuren</DialogTitle>
            <DialogDescription>
              De klant kan daarna opnieuw een betaalbewijs indienen. Voeg zo
              nodig een reden toe.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bijv. bedrag klopt niet"
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" disabled={busy} onClick={submit}>
              Betaling afkeuren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
