import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { listEvents } from '#/server/admin/events.ts'
import { listEventsInputSchema } from '#/lib/validation/admin.ts'
import { formatDateNl, formatDateTimeShortNl } from '#/lib/datetime.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterPills,
  FilterSelect,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'
import { EmptyState } from '#/components/app/empty-state.tsx'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
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

export const Route = createFileRoute('/_admin/admin/events/')({
  validateSearch: listEventsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({ result: await listEvents({ data: deps }) }),
  component: AdminEvents,
  pendingComponent: () => <RoutePendingState />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'Draft', label: 'Concept' },
  { value: 'Published', label: 'Gepubliceerd' },
  { value: 'Archived', label: 'Gearchiveerd' },
] as const

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Aangemaakt' },
  { value: 'startsAt', label: 'Startdatum' },
  { value: 'title', label: 'Titel' },
] as const

function AdminEvents() {
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
    search.status !== 'all' ||
    Boolean(search.organizationId)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Evenementen"
        description="Alle evenementen op het platform, ongeacht organisator."
      />

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op titel of organisatie"
      >
        <FilterPills
          label="Status"
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => update({ status })}
        />
        <FilterSelect
          label="Sorteren"
          value={search.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => update({ sort })}
        />
        {search.organizationId ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            onClick={() => update({ organizationId: undefined })}
          >
            Organisatiefilter wissen
          </button>
        ) : null}
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            filtering ? 'Geen evenementen gevonden' : 'Nog geen evenementen'
          }
          description={
            filtering
              ? 'Geen enkel evenement voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra organisatoren evenementen aanmaken, verschijnen ze hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evenement</TableHead>
                <TableHead>Organisatie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Bestellingen</TableHead>
                <TableHead>Aangemaakt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Link
                      to="/admin/events/$eventId"
                      params={{ eventId: event.id }}
                      className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="font-semibold">{event.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {event._count.ticketTypes}{' '}
                        {event._count.ticketTypes === 1
                          ? 'tickettype'
                          : 'tickettypes'}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$organizationId"
                      params={{ organizationId: event.organization.id }}
                      className="text-sm hover:underline"
                    >
                      {event.organization.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <EventStatusBadge
                      status={event.status}
                      startsAt={event.startsAt}
                      endsAt={event.endsAt}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {event.startsAt
                      ? formatDateTimeShortNl(event.startsAt)
                      : 'Nog geen datum'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event._count.orders}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateNl(event.createdAt)}
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
