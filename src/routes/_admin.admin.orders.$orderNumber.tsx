import { Link, createFileRoute } from '@tanstack/react-router'

import { getOrderDetail } from '#/server/admin/orders.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import {
  PAYMENT_STATUS_LABELS,
  paymentStatusBadgeVariant,
} from '#/lib/payment-status.ts'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATE_LABELS,
  paymentStateBadgeVariant,
} from '#/lib/payment-transitions.ts'
import {
  TICKET_DELIVERY_CHANNEL_LABELS,
  TICKET_STATUS_LABELS,
  ticketStatusBadgeVariant,
} from '#/lib/ticket-status.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_admin/admin/orders/$orderNumber')({
  loader: async ({ params }) =>
    getOrderDetail({ data: { orderNumber: params.orderNumber } }),
  component: AdminOrderDetail,
  pendingComponent: () => <AdminPendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

function AdminOrderDetail() {
  const order = Route.useLoaderData()

  const status = effectiveOrderStatus({
    orderStatus: order.orderStatus,
    expiresAt: order.expiresAt,
  })

  const tickets = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ({
      ...ticket,
      ticketTypeName: item.ticketType.name,
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={[
          { label: 'Bestellingen', to: '/admin/orders' },
          { label: order.orderNumber },
        ]}
        title={order.orderNumber}
        description={`Geplaatst op ${formatDateTimeNl(order.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={orderStatusBadgeVariant(status)}>
              Bestelling: {ORDER_STATUS_LABELS[status]}
            </Badge>
            <Badge variant={paymentStatusBadgeVariant(order.paymentStatus)}>
              Betaling: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
          </div>
        }
      />

      {status !== order.orderStatus ? (
        <Card className="border-warning/40 bg-warning/5 px-5 py-4">
          <p className="text-sm">
            Deze bestelling staat in de database nog op{' '}
            <strong>{ORDER_STATUS_LABELS[order.orderStatus]}</strong>, maar de
            betaaltermijn is op {formatDateTimeNl(order.expiresAt)} verlopen.
            Overal in de applicatie geldt hij daarom als verlopen; de
            gereserveerde tickets zijn weer vrijgegeven.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Besteloverzicht</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col divide-y">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <span className="flex-1 text-sm font-medium">
                    {item.ticketType.name}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {item.quantity} × {formatSrd(item.unitPriceCents)}
                  </span>
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">
                    {formatSrd(item.totalPriceCents)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 border-t pt-4">
              <Amount label="Subtotaal" cents={order.subtotalCents} />
              {order.discountCents > 0 ? (
                <Amount label="Korting" cents={-order.discountCents} />
              ) : null}
              {order.serviceFeeCents > 0 ? (
                <Amount label="Servicekosten" cents={order.serviceFeeCents} />
              ) : null}
              <div className="mt-1 flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Totaal</span>
                <span className="text-lg font-extrabold tabular-nums">
                  {formatSrd(order.totalCents)}
                </span>
              </div>
            </div>

            {order.notes ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Notitie van de klant: {order.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Klant</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">
                {order.customer.firstName} {order.customer.lastName}
              </span>
              <span className="text-muted-foreground">
                {order.customer.email}
              </span>
              <span className="text-muted-foreground">
                {order.customer.phone}
              </span>
              {order.user ? (
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: order.user.id }}
                  className="mt-1 font-semibold text-primary hover:underline"
                >
                  Gekoppeld account bekijken
                </Link>
              ) : (
                <span className="mt-1 text-xs text-muted-foreground">
                  Geplaatst zonder account (gastbestelling).
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evenement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <Link
                to="/admin/events/$eventId"
                params={{ eventId: order.event.id }}
                className="font-semibold hover:underline"
              >
                {order.event.title}
              </Link>
              <Link
                to="/admin/organizations/$organizationId"
                params={{ organizationId: order.event.organization.id }}
                className="text-muted-foreground hover:underline"
              >
                {order.event.organization.name}
              </Link>
              {order.event.startsAt ? (
                <span className="text-muted-foreground">
                  {formatDateTimeNl(order.event.startsAt)}
                </span>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Betaling</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Het platform verwerkt zelf geen betalingen. De organisator
            beoordeelt of een betaling geldig is — daarom kun je vanuit het
            beheer geen betaalstatus wijzigen.
          </p>

          {order.payment ? (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
              <Field
                label="Betaalmethode"
                value={PAYMENT_METHOD_LABELS[order.payment.method]}
              />
              <div>
                <dt className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
                  Toestand betaling
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant={paymentStateBadgeVariant(order.payment.state)}
                  >
                    {PAYMENT_STATE_LABELS[order.payment.state]}
                  </Badge>
                </dd>
              </div>
              <Field
                label="Referentie"
                value={order.payment.reference ?? '—'}
              />
              <Field
                label="Betaalverzoek verstuurd"
                value={
                  order.payment.requestedAt
                    ? formatDateTimeNl(order.payment.requestedAt)
                    : '—'
                }
              />
              <Field
                label="Beoordeeld op"
                value={
                  order.payment.verifiedAt
                    ? formatDateTimeNl(order.payment.verifiedAt)
                    : 'Nog niet beoordeeld'
                }
              />
              <Field
                label="Notitie organisator"
                value={order.payment.notes ?? '—'}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Er is nog geen betaalrecord aangemaakt voor deze bestelling.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 px-0 pb-4">
        <CardHeader className="px-5 pb-4">
          <CardTitle className="text-base">
            Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        {tickets.length === 0 ? (
          <p className="px-5 pb-2 text-sm text-muted-foreground">
            Er zijn nog geen tickets uitgegeven. Tickets worden pas aangemaakt
            zodra de organisator de betaling heeft goedgekeurd.
          </p>
        ) : (
          <div className="flex flex-col divide-y px-5">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span className="flex-1 font-mono text-xs break-all">
                  {ticket.ticketNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  {ticket.ticketTypeName}
                </span>
                <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {ticket.checkedInAt
                    ? `Ingecheckt ${formatDateTimeNl(ticket.checkedInAt)}`
                    : ticket.sentAt
                      ? `Verstuurd via ${ticket.sentVia ? TICKET_DELIVERY_CHANNEL_LABELS[ticket.sentVia] : 'onbekend'}`
                      : 'Nog niet verstuurd'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Amount({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatSrd(cents)}</span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
