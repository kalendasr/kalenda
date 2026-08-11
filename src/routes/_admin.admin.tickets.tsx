import { Link, createFileRoute } from '@tanstack/react-router'
import { Ticket } from 'lucide-react'

import { getTicketStatusSummary, listTickets } from '#/server/admin/tickets.ts'
import { listTicketsInputSchema } from '#/lib/validation/admin.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import {
  TICKET_STATUS_LABELS,
  ticketStatusBadgeVariant,
} from '#/lib/ticket-status.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterPills,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
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

export const Route = createFileRoute('/_admin/admin/tickets')({
  validateSearch: listTicketsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, summary] = await Promise.all([
      listTickets({ data: deps }),
      getTicketStatusSummary(),
    ])
    return { result, summary }
  },
  component: AdminTickets,
  pendingComponent: () => <RoutePendingState />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'Issued', label: 'Aangemaakt' },
  { value: 'Sent', label: 'Verstuurd' },
  { value: 'CheckedIn', label: 'Gebruikt' },
  { value: 'Cancelled', label: 'Ingetrokken' },
] as const

function AdminTickets() {
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
    Boolean(search.search) || search.status !== 'all' || Boolean(search.eventId)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Tickets"
        description="Zoek een ticket op ticketnummer, ordernummer of klant. Tickets worden hier alleen ingezien — uitgeven, intrekken en inchecken gebeurt via de organisator en de scanner."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aangemaakt" value={summary.Issued ?? 0} />
        <StatCard label="Verstuurd" value={summary.Sent ?? 0} />
        <StatCard label="Gebruikt" value={summary.CheckedIn ?? 0} />
        <StatCard
          label="Ingetrokken"
          value={summary.Cancelled ?? 0}
          tone={(summary.Cancelled ?? 0) > 0 ? 'danger' : 'default'}
        />
      </section>

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op ticketnummer, ordernummer, e-mail of achternaam"
      >
        <FilterPills
          label="Ticketstatus"
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => update({ status })}
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
          icon={Ticket}
          title={filtering ? 'Geen tickets gevonden' : 'Nog geen tickets'}
          description={
            filtering
              ? 'Geen enkel ticket voldoet aan deze zoekopdracht en filters. Ticketnummers en ordernummers worden exact gezocht — controleer of je het volledige nummer hebt.'
              : 'Tickets worden aangemaakt zodra een organisator een betaling goedkeurt.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Eigenaar</TableHead>
                <TableHead>Evenement</TableHead>
                <TableHead>Tickettype</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Uitgegeven</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((ticket) => {
                const order = ticket.orderItem.order
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <span className="font-mono text-xs break-all">
                        {ticket.ticketNumber}
                      </span>
                      <Link
                        to="/admin/orders/$orderNumber"
                        params={{ orderNumber: order.orderNumber }}
                        className="block font-mono text-xs text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
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
                    <TableCell className="text-sm">
                      {ticket.orderItem.ticketType.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {ticket.checkedInAt ? (
                        <>
                          {formatDateTimeShortNl(ticket.checkedInAt)}
                          {ticket.checkedBy ? (
                            <span className="block text-xs">
                              door {ticket.checkedBy.name}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        'Niet ingecheckt'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeShortNl(ticket.issuedAt)}
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
