import { Link, createFileRoute } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'

import {
  getPaymentStateSummary,
  listPayments,
} from '#/server/admin/payments.ts'
import { listPaymentsInputSchema } from '#/lib/validation/admin.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATE_LABELS,
  paymentStateBadgeVariant,
} from '#/lib/payment-transitions.ts'
import {
  PAYMENT_STATUS_LABELS,
  paymentStatusBadgeVariant,
} from '#/lib/payment-status.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterSelect,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
import { EmptyState } from '#/components/app/empty-state.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Pagination } from '#/components/ui/pagination.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'

export const Route = createFileRoute('/_admin/admin/payments')({
  validateSearch: listPaymentsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, summary] = await Promise.all([
      listPayments({ data: deps }),
      getPaymentStateSummary(),
    ])
    return { result, summary }
  },
  component: AdminPayments,
  pendingComponent: () => <AdminPendingState />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

const STATE_OPTIONS = [
  { value: 'all', label: 'Alle toestanden' },
  { value: 'Waiting', label: 'Wachtend' },
  { value: 'Requested', label: 'Verzoek verstuurd' },
  { value: 'Submitted', label: 'Bewijs ingediend' },
  { value: 'Verified', label: 'Geverifieerd' },
  { value: 'Rejected', label: 'Afgewezen' },
  { value: 'Cancelled', label: 'Geannuleerd' },
] as const

const METHOD_OPTIONS = [
  { value: 'all', label: 'Alle methoden' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'BankTransfer', label: 'Bankoverschrijving' },
] as const

function AdminPayments() {
  const { result, summary } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  function update(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, page: 1, ...patch }),
      replace: true,
    })
  }

  const filtering =
    Boolean(search.search) || search.state !== 'all' || search.method !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Betalingen"
        description="Inzage in alle betaalrecords. Het platform ontvangt zelf geen geld — de organisator beoordeelt elke betaling, dus hier kun je niets wijzigen."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Bewijs ingediend"
          value={summary.Submitted ?? 0}
          subtext="Wacht op de organisator"
          tone={(summary.Submitted ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Geverifieerd" value={summary.Verified ?? 0} />
        <StatCard
          label="Afgewezen"
          value={summary.Rejected ?? 0}
          tone={(summary.Rejected ?? 0) > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Verzoek verstuurd"
          value={summary.Requested ?? 0}
          subtext="Wacht op de klant"
        />
      </section>

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op referentie, ordernummer of e-mail"
      >
        <FilterSelect
          label="Toestand"
          value={search.state}
          options={STATE_OPTIONS}
          onChange={(state) => update({ state })}
        />
        <FilterSelect
          label="Methode"
          value={search.method}
          options={METHOD_OPTIONS}
          onChange={(method) => update({ method })}
        />
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={filtering ? 'Geen betalingen gevonden' : 'Nog geen betalingen'}
          description={
            filtering
              ? 'Geen enkel betaalrecord voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra er bestellingen geplaatst worden, verschijnen de bijbehorende betalingen hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bestelling</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Toestand betaling</TableHead>
                <TableHead>Betaalstatus bestelling</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead>Beoordeeld</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Link
                      to="/admin/orders/$orderNumber"
                      params={{ orderNumber: payment.order.orderNumber }}
                      className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="font-mono text-sm font-semibold">
                        {payment.order.orderNumber}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {payment.order.event.title}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {payment.order.customer.firstName}{' '}
                      {payment.order.customer.lastName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {payment.order.customer.email}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                    {payment.reference ? (
                      <span className="block text-xs text-muted-foreground">
                        {payment.reference}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentStateBadgeVariant(payment.state)}>
                      {PAYMENT_STATE_LABELS[payment.state]}
                    </Badge>
                    {payment.state === 'Rejected' && payment.notes ? (
                      <span className="mt-0.5 block max-w-48 text-xs text-muted-foreground">
                        {payment.notes}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={paymentStatusBadgeVariant(
                        payment.order.paymentStatus,
                      )}
                    >
                      {PAYMENT_STATUS_LABELS[payment.order.paymentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatSrd(payment.order.totalCents)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {payment.verifiedAt ? (
                      <>
                        {formatDateTimeShortNl(payment.verifiedAt)}
                        {payment.verifiedByName ? (
                          <span className="block text-xs">
                            door {payment.verifiedByName}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            meta={result.meta}
            onPageChange={(page) =>
              void navigate({
                search: (previous) => ({ ...previous, page }),
                replace: true,
              })
            }
            onPageSizeChange={(pageSize: PageSize) => update({ pageSize })}
            className="mt-4"
          />
        </Card>
      )}
    </div>
  )
}
