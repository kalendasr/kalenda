import { useRef, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  Upload,
} from 'lucide-react'
import { TicketQr } from '#/components/public/ticket-qr.tsx'

import { getOrderByNumber } from '#/server/checkout.ts'
import { submitProofOfPayment } from '#/server/payments.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import { Badge } from '#/components/ui/badge.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { toast } from '#/components/ui/sonner.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'

export const Route = createFileRoute('/bestelling/$orderNumber')({
  loader: async ({ params }) => ({
    order: await getOrderByNumber({
      data: { orderNumber: params.orderNumber },
    }),
  }),
  head: ({ params }) => ({
    meta: [{ title: `Bestelling ${params.orderNumber} · Kalenda` }],
  }),
  component: OrderStatusPage,
})

function OrderStatusPage() {
  const { order } = Route.useLoaderData()

  if (!order) {
    return (
      <>
        <PublicHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6"
        >
          <h1 className="text-2xl font-semibold">Bestelling niet gevonden</h1>
          <p className="mt-2 text-muted-foreground">
            Controleer de link uit je bevestigingsmail.
          </p>
          <Link
            to="/evenementen"
            className="mt-6 inline-block font-medium text-primary hover:underline"
          >
            Bekijk evenementen
          </Link>
        </main>
      </>
    )
  }

  const status = effectiveOrderStatus(order)
  const isPending = status === 'PendingPayment' || status === 'AwaitingReview'
  const org = order.event.organization
  const bank = org.paymentSettings

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bedankt voor je bestelling
          </h1>
          <p className="text-muted-foreground">
            Bestelnummer{' '}
            <span className="font-medium">{order.orderNumber}</span>
          </p>
          <Badge variant={orderStatusBadgeVariant(status)}>
            {ORDER_STATUS_LABELS[status]}
          </Badge>
        </div>

        {/* Vervolgstap */}
        {isPending ? (
          order.paymentMethod === 'WhatsApp' ? (
            <Alert variant="info" className="mt-6">
              <Clock />
              <AlertTitle>Wat gebeurt er nu?</AlertTitle>
              <AlertDescription>
                <span>
                  De organisator stuurt je een betaalverzoek
                  {order.paymentApp ? ` via ${order.paymentApp}` : ''}
                  {org.phone ? ` (WhatsApp ${org.phone})` : ''}. Zodra je
                  betaling is bevestigd, ontvang je je tickets per e-mail. Rond
                  je betaling af vóór {formatDateTimeNl(order.expiresAt)}.
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="info" className="mt-6">
              <Clock />
              <AlertTitle>Maak het bedrag over</AlertTitle>
              <AlertDescription>
                <span>
                  Maak {formatSrd(order.totalCents)} over met kenmerk{' '}
                  <strong>{order.orderNumber}</strong>, vóór{' '}
                  {formatDateTimeNl(order.expiresAt)}.
                </span>
                {bank?.bankEnabled ? (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {bank.bankName ? (
                      <>
                        <dt className="text-muted-foreground">Bank</dt>
                        <dd>{bank.bankName}</dd>
                      </>
                    ) : null}
                    {bank.accountHolder ? (
                      <>
                        <dt className="text-muted-foreground">
                          Rekeninghouder
                        </dt>
                        <dd>{bank.accountHolder}</dd>
                      </>
                    ) : null}
                    {bank.accountNumber ? (
                      <>
                        <dt className="text-muted-foreground">
                          Rekeningnummer
                        </dt>
                        <dd>{bank.accountNumber}</dd>
                      </>
                    ) : null}
                    {bank.branch ? (
                      <>
                        <dt className="text-muted-foreground">Bijkantoor</dt>
                        <dd>{bank.branch}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : null}
                {bank?.paymentInstructions ? (
                  <span className="mt-2 block text-sm whitespace-pre-line">
                    {bank.paymentInstructions}
                  </span>
                ) : null}
              </AlertDescription>
            </Alert>
          )
        ) : null}

        {status === 'Expired' ? (
          <Alert variant="warning" className="mt-6">
            <Clock />
            <AlertTitle>Deze bestelling is verlopen</AlertTitle>
            <AlertDescription>
              De betaaltermijn is verstreken en de tickets zijn weer
              vrijgegeven. Plaats gerust een nieuwe bestelling.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Bank: betaalbewijs uploaden/opnieuw indienen (BR-603/605) */}
        {order.paymentMethod === 'BankTransfer' && status !== 'Expired' ? (
          <BankProofUpload
            orderStatus={status}
            paymentState={order.payment?.state ?? 'Waiting'}
            paymentNotes={order.payment?.notes ?? null}
            orderNumber={order.orderNumber}
          />
        ) : null}

        {/* Ordersamenvatting */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{order.event.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {order.event.startsAt ? (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  {formatDateTimeNl(order.event.startsAt)}
                </span>
              ) : null}
              {order.event.venue ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" />
                  {[order.event.venue.name, order.event.venue.district]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              ) : null}
            </div>

            <ul className="flex flex-col gap-2 border-t pt-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-2 text-sm"
                >
                  <span>
                    {item.quantity}× {item.ticketType.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Totaal</span>
              <span className="tabular-nums">
                {formatSrd(order.totalCents)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tickets tonen zodra de betaling is bevestigd (Fase 6). */}
        {status === 'Paid' || status === 'Completed' ? (
          <TicketsCard
            allTickets={order.items.flatMap((item) =>
              item.tickets.map((ticket) => ({
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                ticketTypeName: item.ticketType.name,
              })),
            )}
            baseUrl={order.baseUrl}
          />
        ) : null}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Bewaar deze pagina — je hebt geen account nodig om je bestelling te
          bekijken.
        </p>
      </main>
    </>
  )
}

function BankProofUpload({
  orderStatus,
  paymentState,
  paymentNotes,
  orderNumber,
}: {
  orderStatus: string
  paymentState: string
  paymentNotes: string | null
  orderNumber: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reference, setReference] = useState('')
  const [uploading, setUploading] = useState(false)

  const isSubmitted = paymentState === 'Submitted'
  const isRejected = paymentState === 'Rejected'
  const isPaid = orderStatus === 'Paid' || orderStatus === 'Completed'

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('Kies eerst een betaalbewijs (PNG, JPG of WebP).')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('orderNumber', orderNumber)
    if (reference.trim()) formData.append('reference', reference.trim())

    setUploading(true)
    try {
      await submitProofOfPayment({ data: formData })
      toast.success('Je betaalbewijs is ontvangen.')
      await router.invalidate()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Uploaden is niet gelukt. Probeer het opnieuw.',
      )
    } finally {
      setUploading(false)
    }
  }

  if (isPaid) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Betaalbewijs uploaden</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isSubmitted ? (
          <Alert variant="info">
            <Clock />
            <AlertTitle>Bewijs ontvangen</AlertTitle>
            <AlertDescription>
              We hebben je betaalbewijs ontvangen. Zodra de organisator het
              heeft gecontroleerd, ontvang je je tickets per e-mail.
            </AlertDescription>
          </Alert>
        ) : null}

        {isRejected ? (
          <Alert variant="destructive">
            <AlertTitle>Betaling afgekeurd</AlertTitle>
            <AlertDescription>
              {paymentNotes
                ? `De organisator gaf als reden: “${paymentNotes}”. `
                : 'De organisator heeft je betaalbewijs niet goedgekeurd. '}
              Je kunt hieronder een nieuw betaalbewijs uploaden.
            </AlertDescription>
          </Alert>
        ) : null}

        {!isSubmitted ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reference">
                Betalingsreferentie{' '}
                <span className="text-muted-foreground">(optioneel)</span>
              </Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Bijv. TRN-1425 of je naam"
              />
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload />
                {fileRef.current?.files?.[0]?.name ?? 'Kies een afbeelding'}
              </Button>
              <Button type="button" disabled={uploading} onClick={handleUpload}>
                {uploading
                  ? 'Bezig met uploaden…'
                  : isRejected
                    ? 'Opnieuw uploaden'
                    : 'Betaalbewijs versturen'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload een foto of scan van je overschrijving (max. 5 MB,
              PNG/JPG/WebP).
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

type OrderTicket = {
  id: string
  ticketNumber: string
  ticketTypeName: string
}

function TicketsCard({
  allTickets,
  baseUrl,
}: {
  allTickets: OrderTicket[]
  baseUrl: string
}) {
  if (allTickets.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <QrCode className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Je tickets worden aangemaakt. Kom over een paar minuten terug, of je
            ontvangt ze per e-mail.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-4" />
          Jouw tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {allTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <TicketQr
              ticketNumber={ticket.ticketNumber}
              baseUrl={baseUrl}
              size={132}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{ticket.ticketTypeName}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {ticket.ticketNumber}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Toon deze QR-code bij de ingang. Je ontvangt je tickets ook per
                e-mail als PDF.
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
