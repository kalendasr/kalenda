import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Inbox, X } from 'lucide-react'

import { listEventOrders } from '#/server/orders.ts'
import {
  approvePayment,
  getProofSignedUrl,
  rejectPayment,
} from '#/server/payments.ts'
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
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
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

function EventOrders() {
  const { orders } = Route.useLoaderData()
  const router = useRouter()

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
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
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
        />
      ))}
    </ul>
  )
}

function OrderCard({
  order,
  onApprove,
  onReject,
}: {
  order: OrderRow
  onApprove: () => Promise<void>
  onReject: (notes?: string) => Promise<void>
}) {
  const status = effectiveOrderStatus(order)
  const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const pay = order.payment
  const isWhatsApp = order.paymentMethod === 'WhatsApp'
  const showActions =
    pay &&
    (pay.state === 'Waiting' || pay.state === 'Submitted') &&
    status !== 'Expired' &&
    status !== 'Cancelled'

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
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono">{order.orderNumber}</span>
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
