import { Link, createFileRoute } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'

import { listOrders } from '#/server/admin/orders.ts'
import { listOrdersInputSchema } from '#/lib/validation/admin.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import {
  PAYMENT_STATUS_LABELS,
  paymentStatusBadgeVariant,
} from '#/lib/payment-status.ts'
import { PAYMENT_METHOD_LABELS } from '#/lib/payment-transitions.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterSelect,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
import { EmptyState } from '#/components/app/empty-state.tsx'
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

export const Route = createFileRoute('/_admin/admin/orders/')({
  validateSearch: listOrdersInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({ result: await listOrders({ data: deps }) }),
  component: AdminOrders,
  pendingComponent: () => <RoutePendingState />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Alle bestelstatussen' },
  { value: 'PendingPayment', label: 'Wacht op betaling' },
  { value: 'AwaitingReview', label: 'Wacht op controle' },
  { value: 'Paid', label: 'Betaald' },
  { value: 'Completed', label: 'Afgerond' },
  { value: 'Cancelled', label: 'Geannuleerd' },
  { value: 'Expired', label: 'Verlopen' },
] as const

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Alle betaalstatussen' },
  { value: 'Unpaid', label: 'Niet betaald' },
  { value: 'Pending', label: 'In behandeling' },
  { value: 'Verified', label: 'Geverifieerd' },
  { value: 'Rejected', label: 'Afgewezen' },
] as const

function AdminOrders() {
  const { result } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  function update(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, page: 1, ...patch }),
      replace: true,
    })
  }

  const filtering =
    Boolean(search.search) ||
    search.orderStatus !== 'all' ||
    search.paymentStatus !== 'all' ||
    Boolean(search.eventId)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Bestellingen"
        description="Alle bestellingen op het platform. Bestelstatus en betaalstatus zijn twee verschillende dingen en staan daarom in aparte kolommen."
      />

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op ordernummer, e-mail, achternaam of evenement"
      >
        <FilterSelect
          label="Bestelstatus"
          value={search.orderStatus}
          options={ORDER_STATUS_OPTIONS}
          onChange={(orderStatus) => update({ orderStatus })}
        />
        <FilterSelect
          label="Betaalstatus"
          value={search.paymentStatus}
          options={PAYMENT_STATUS_OPTIONS}
          onChange={(paymentStatus) => update({ paymentStatus })}
        />
        {search.eventId ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            onClick={() => update({ eventId: undefined })}
          >
            Evenementfilter wissen
          </button>
        ) : null}
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            filtering ? 'Geen bestellingen gevonden' : 'Nog geen bestellingen'
          }
          description={
            filtering
              ? 'Geen enkele bestelling voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra bezoekers tickets bestellen, verschijnen de bestellingen hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bestelling</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Evenement</TableHead>
                <TableHead>Bestelstatus</TableHead>
                <TableHead>Betaalstatus</TableHead>
                <TableHead className="text-right">Totaal</TableHead>
                <TableHead>Geplaatst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((order) => {
                const status = effectiveOrderStatus({
                  orderStatus: order.orderStatus,
                  expiresAt: order.expiresAt,
                })
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        to="/admin/orders/$orderNumber"
                        params={{ orderNumber: order.orderNumber }}
                        className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="font-mono text-sm font-semibold">
                          {order.orderNumber}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {order.customer.firstName} {order.customer.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {order.customer.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/admin/events/$eventId"
                        params={{ eventId: order.event.id }}
                        className="text-sm hover:underline"
                      >
                        {order.event.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {order.event.organization.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={orderStatusBadgeVariant(status)}>
                        {ORDER_STATUS_LABELS[status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={paymentStatusBadgeVariant(order.paymentStatus)}
                      >
                        {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatSrd(order.totalCents)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeShortNl(order.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
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
