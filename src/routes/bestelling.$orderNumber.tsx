import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays, CheckCircle2, Clock, MapPin } from 'lucide-react'

import { getOrderByNumber } from '#/server/checkout.ts'
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

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Bewaar deze pagina — je hebt geen account nodig om je bestelling te
          bekijken.
        </p>
      </main>
    </>
  )
}
