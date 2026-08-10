import { useState } from 'react'
import { Bell, Check, ExternalLink, Send, X } from 'lucide-react'

import type { OrderStatus } from '#/lib/order-status.ts'
import {
  deriveOrderStage,
  ORDER_STAGE_LABELS,
  orderStageBadgeVariant,
} from '#/lib/order-stage.ts'
import type { OrderStage } from '#/lib/order-stage.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  TICKET_DELIVERY_CHANNEL_LABELS,
  TICKET_STATUS_LABELS,
  ticketStatusBadgeVariant,
} from '#/lib/ticket-status.ts'
import { cn } from '#/lib/utils.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Separator } from '#/components/ui/separator.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { CustomerPushForm } from '#/components/app/customer-push-form.tsx'

/**
 * Orderdetail voor de organisator (Fase 9): tijdlijn + ticketlevering.
 *
 * Vervangt de dubbele statusbadge door één fase (`deriveOrderStage`) en maakt
 * expliciet zichtbaar wat er tot nu toe is gebeurd — inclusief het moment
 * waarop het betaalverzoek is verstuurd en waarheen/wanneer de tickets zijn
 * geleverd. Eén verantwoordelijkheid: dit scherm toont en handelt af, het
 * berekent geen afgeleide waarden zelf (die komen uit `order-stage.ts`).
 */

type TicketRow = {
  id: string
  ticketNumber: string
  status: 'Issued' | 'Sent' | 'CheckedIn' | 'Cancelled'
  sentAt: Date | null
  sentVia: 'Email' | 'WhatsApp' | null
  checkedInAt: Date | null
}

export type OrderDetailData = {
  id: string
  orderNumber: string
  orderStatus: OrderStatus
  createdAt: Date
  expiresAt: Date
  totalCents: number
  paymentMethod: 'WhatsApp' | 'BankTransfer'
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  payment: {
    state:
      | 'Waiting'
      | 'Requested'
      | 'Submitted'
      | 'Verified'
      | 'Rejected'
      | 'Cancelled'
    requestedAt: Date | null
    verifiedAt: Date | null
    notes: string | null
    proofKey: string | null
  } | null
  items: Array<{
    quantity: number
    ticketType: { name: string }
    tickets: Array<TicketRow>
  }>
}

type TimelineStep = {
  label: string
  at: Date | null
  done: boolean
}

function buildTimeline(
  order: OrderDetailData,
  latestSentAt: Date | null,
): Array<TimelineStep> {
  const isBank = order.paymentMethod === 'BankTransfer'
  const steps: Array<TimelineStep> = [
    { label: 'Besteld', at: order.createdAt, done: true },
  ]

  if (isBank) {
    steps.push({
      label: 'Bewijs ontvangen',
      at: order.payment?.state === 'Waiting' ? null : order.createdAt,
      done: order.payment?.state !== 'Waiting',
    })
  } else {
    steps.push({
      label: 'Betaalverzoek verstuurd',
      at: order.payment?.requestedAt ?? null,
      done: Boolean(order.payment?.requestedAt),
    })
  }

  steps.push({
    label: 'Betaling bevestigd',
    at: order.payment?.verifiedAt ?? null,
    done: Boolean(order.payment?.verifiedAt),
  })

  steps.push({
    label: 'Tickets verstuurd',
    at: latestSentAt,
    done: Boolean(latestSentAt),
  })

  return steps
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onSendPaymentRequest,
  onResendEmail,
  onShareWhatsApp,
  onViewProof,
  onSendPush,
}: {
  order: OrderDetailData
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: () => Promise<void>
  onReject: (notes?: string) => Promise<void>
  onSendPaymentRequest: () => Promise<void>
  onResendEmail: () => Promise<void>
  onShareWhatsApp: () => Promise<void>
  onViewProof: () => Promise<void>
  onSendPush: (title: string, body: string) => Promise<number>
}) {
  const tickets = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ({
      ...ticket,
      typeName: item.ticketType.name,
    })),
  )
  const latestSentAt = tickets.reduce<Date | null>((latest, ticket) => {
    if (!ticket.sentAt) return latest
    if (!latest || ticket.sentAt > latest) return ticket.sentAt
    return latest
  }, null)
  const stage = deriveOrderStage({
    orderStatus: order.orderStatus,
    expiresAt: order.expiresAt,
    paymentMethod: order.paymentMethod,
    payment: order.payment,
    ticketsSent: tickets.length > 0 && tickets.every((t) => Boolean(t.sentAt)),
  })
  const timeline = buildTimeline(order, latestSentAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>
              {order.customer.firstName} {order.customer.lastName}
            </DialogTitle>
            <StageBadge stage={stage} />
          </div>
          <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-eyebrow">{order.orderNumber}</span>
            <span>{formatSrd(order.totalCents)}</span>
            <a
              href={`tel:${order.customer.phone}`}
              className="hover:text-foreground"
            >
              {order.customer.phone}
            </a>
            <a
              href={`mailto:${order.customer.email}`}
              className="hover:text-foreground"
            >
              {order.customer.email}
            </a>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ol className="flex flex-col gap-3">
          {timeline.map((step) => (
            <li key={step.label} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                  step.done
                    ? 'border-success bg-success/10 text-success'
                    : 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {step.done ? <Check className="size-3" /> : null}
              </span>
              <div>
                <div
                  className={cn(
                    'text-sm font-medium',
                    !step.done && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.at ? formatDateTimeNl(step.at) : 'Nog niet'}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {order.payment?.notes ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {order.payment.notes}
          </p>
        ) : null}

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Tickets ({tickets.length})
          </h3>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Er zijn nog geen tickets uitgegeven.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{ticket.typeName}</div>
                    <div className="font-eyebrow text-xs text-muted-foreground">
                      {ticket.ticketNumber.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {ticket.sentAt && ticket.sentVia
                        ? `${TICKET_DELIVERY_CHANNEL_LABELS[ticket.sentVia]} · ${formatDateTimeNl(ticket.sentAt)}`
                        : 'Nog niet verstuurd'}
                    </span>
                    <a
                      href={`/ticket/${ticket.ticketNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Bekijk <ExternalLink className="size-3" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {stage === 'NewOrder' ? (
              <Button size="sm" onClick={onSendPaymentRequest}>
                <Send />
                Betaalverzoek versturen
              </Button>
            ) : null}

            {stage === 'ProofSubmitted' && order.payment?.proofKey ? (
              <Button size="sm" variant="outline" onClick={onViewProof}>
                Bewijs bekijken
              </Button>
            ) : null}

            {stage === 'PaymentRequested' ||
            stage === 'AwaitingTransfer' ||
            stage === 'ProofSubmitted' ? (
              <ConfirmDialog
                trigger={
                  <Button size="sm">
                    <Check />
                    Bevestig betaling
                  </Button>
                }
                title="Betaling bevestigen"
                description={`Bevestig dat je ${formatSrd(order.totalCents)} hebt ontvangen. We maken daarna ${order.items.reduce((sum, i) => sum + i.quantity, 0)} tickets aan en mailen ze naar ${order.customer.email}.`}
                confirmLabel="Ja, bevestig betaling"
                onConfirm={onApprove}
              />
            ) : null}

            {stage === 'PaymentRequested' ||
            stage === 'AwaitingTransfer' ||
            stage === 'ProofSubmitted' ? (
              <RejectButton onReject={onReject} />
            ) : null}

            {stage === 'TicketsPending' || stage === 'Done' ? (
              <>
                <Button size="sm" variant="outline" onClick={onResendEmail}>
                  <Send />
                  {stage === 'Done' ? 'Opnieuw mailen' : 'Verstuur tickets'}
                </Button>
                <Button size="sm" variant="outline" onClick={onShareWhatsApp}>
                  Delen via WhatsApp
                </Button>
                <SendPushButton onSend={onSendPush} />
              </>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StageBadge({ stage }: { stage: OrderStage }) {
  return (
    <Badge variant={orderStageBadgeVariant(stage)}>
      {ORDER_STAGE_LABELS[stage]}
    </Badge>
  )
}

function SendPushButton({
  onSend,
}: {
  onSend: (title: string, body: string) => Promise<number>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Bell />
        Bericht sturen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bericht sturen</DialogTitle>
            <DialogDescription>
              Stuur een pushmelding naar deze klant, bijvoorbeeld over een
              gewijzigde locatie of starttijd.
            </DialogDescription>
          </DialogHeader>
          <CustomerPushForm onSend={onSend} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
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
              De klant krijgt hier automatisch een melding van en kan daarna
              opnieuw een betaalbewijs indienen. Voeg zo nodig een reden toe.
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
