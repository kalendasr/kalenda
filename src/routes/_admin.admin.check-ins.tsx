import { Link, createFileRoute } from '@tanstack/react-router'
import { QrCode } from 'lucide-react'

import { getCheckInStats, listCheckIns } from '#/server/admin/check-ins.ts'
import { listCheckInsInputSchema } from '#/lib/validation/admin.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import { SCAN_RESULT_LABELS, scanResultBadgeClass } from '#/lib/scan-result.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterPills,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
import { EmptyState } from '#/components/app/empty-state.tsx'
import { StatCard } from '#/components/app/stat-card.tsx'
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
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/_admin/admin/check-ins')({
  validateSearch: listCheckInsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, stats] = await Promise.all([
      listCheckIns({ data: deps }),
      getCheckInStats({ data: { eventId: deps.eventId } }),
    ])
    return { result, stats }
  },
  component: AdminCheckIns,
  pendingComponent: () => <AdminPendingState />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

const RESULT_OPTIONS = [
  { value: 'all', label: 'Alle scans' },
  { value: 'Valid', label: 'Geldig' },
  { value: 'AlreadyCheckedIn', label: 'Al ingecheckt' },
  { value: 'Invalid', label: 'Ongeldig' },
  { value: 'NotFound', label: 'Onbekend' },
] as const

function AdminCheckIns() {
  const { result, stats } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  function update(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, page: 1, ...patch }),
      replace: true,
    })
  }

  const filtering = Boolean(search.search) || search.result !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Check-ins"
        description={
          search.eventId
            ? 'Scanlog en check-instatistieken voor het gefilterde evenement.'
            : 'Scanlog en check-instatistieken over alle evenementen heen.'
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tickets verkocht" value={stats.ticketsIssued} />
        <StatCard label="Ingecheckt" value={stats.ticketsCheckedIn} />
        <StatCard
          label="Nog niet ingecheckt"
          value={stats.ticketsNotCheckedIn}
        />
        <StatCard
          label="Check-inpercentage"
          value={`${Math.round(stats.checkInRate * 100)}%`}
          subtext={`${stats.totalScans} scans in totaal`}
        />
      </section>

      <Card className="px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Het aantal ingecheckte bezoekers komt uit de ticketstatus, niet uit
          het aantal scans: een tweede scan van hetzelfde ticket levert{' '}
          <strong>Al ingecheckt</strong> op en telt dus niet dubbel mee. Ook
          mislukte scans staan in het log, zodat je kunt zien wat er bij de
          ingang gebeurde.
        </p>
      </Card>

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op ticketnummer, evenement of scanner"
      >
        <FilterPills
          label="Scanresultaat"
          value={search.result}
          options={RESULT_OPTIONS}
          onChange={(value) => update({ result: value })}
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
          icon={QrCode}
          title={filtering ? 'Geen scans gevonden' : 'Nog geen scans'}
          description={
            filtering
              ? 'Geen enkele scan voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra er bij een evenement tickets gescand worden, verschijnt hier het volledige scanlog.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tijdstip</TableHead>
                <TableHead>Resultaat</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Bezoeker</TableHead>
                <TableHead>Evenement</TableHead>
                <TableHead>Gescand door</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((checkIn) => {
                const order = checkIn.ticket?.orderItem.order
                return (
                  <TableRow key={checkIn.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeShortNl(checkIn.scannedAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-[7px] px-2 py-0.5 text-[11.5px] font-bold',
                          scanResultBadgeClass(checkIn.result),
                        )}
                      >
                        {SCAN_RESULT_LABELS[checkIn.result]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs break-all">
                        {checkIn.ticketNumber}
                      </span>
                      {checkIn.ticket ? (
                        <span className="block text-xs text-muted-foreground">
                          {checkIn.ticket.orderItem.ticketType.name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {order ? (
                        <>
                          <span className="text-sm">
                            {order.customer.firstName} {order.customer.lastName}
                          </span>
                          <Link
                            to="/admin/orders/$orderNumber"
                            params={{ orderNumber: order.orderNumber }}
                            className="block font-mono text-xs text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Onbekend ticketnummer
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/admin/events/$eventId"
                        params={{ eventId: checkIn.event.id }}
                        className="text-sm hover:underline"
                      >
                        {checkIn.event.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {checkIn.event.organization.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {checkIn.scannedBy.name}
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
