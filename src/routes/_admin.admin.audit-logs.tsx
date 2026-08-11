import { Link, createFileRoute } from '@tanstack/react-router'
import { ScrollText } from 'lucide-react'

import { listAuditLogs } from '#/server/admin/audit.ts'
import { listAuditLogsInputSchema } from '#/lib/validation/admin.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_TYPE_LABELS,
  auditActionBadgeVariant,
} from '#/lib/admin-labels.ts'
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
import { Badge } from '#/components/ui/badge.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Pagination } from '#/components/ui/pagination.tsx'

export const Route = createFileRoute('/_admin/admin/audit-logs')({
  validateSearch: listAuditLogsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({ result: await listAuditLogs({ data: deps }) }),
  component: AdminAuditLogs,
  pendingComponent: () => <RoutePendingState />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const TARGET_OPTIONS = [
  { value: 'all', label: 'Alles' },
  { value: 'User', label: 'Gebruikers' },
  { value: 'Organization', label: 'Organisaties' },
  { value: 'Event', label: 'Evenementen' },
  { value: 'Category', label: 'Categorieën' },
] as const

/**
 * Doorklikken vanuit het logboek naar het onderwerp. Categorieën hebben geen
 * eigen detailpagina, dus die blijven platte tekst.
 */
function TargetLink({
  targetType,
  targetId,
  label,
}: {
  targetType: 'User' | 'Organization' | 'Event' | 'Category'
  targetId: string
  label: string
}) {
  const className = 'font-semibold hover:underline'

  if (targetType === 'User') {
    return (
      <Link
        to="/admin/users/$userId"
        params={{ userId: targetId }}
        className={className}
      >
        {label}
      </Link>
    )
  }
  if (targetType === 'Organization') {
    return (
      <Link
        to="/admin/organizations/$organizationId"
        params={{ organizationId: targetId }}
        className={className}
      >
        {label}
      </Link>
    )
  }
  if (targetType === 'Event') {
    return (
      <Link
        to="/admin/events/$eventId"
        params={{ eventId: targetId }}
        className={className}
      >
        {label}
      </Link>
    )
  }
  return <span className="font-semibold">{label}</span>
}

function AdminAuditLogs() {
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
    search.targetType !== 'all' ||
    Boolean(search.actorId)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Logboek"
        description="Elke ingreep van een platformbeheerder wordt hier vastgelegd. Regels kunnen niet gewijzigd of verwijderd worden — ook niet door een beheerder."
      />

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op beheerder of onderwerp"
      >
        <FilterPills
          label="Onderwerp"
          value={search.targetType}
          options={TARGET_OPTIONS}
          onChange={(targetType) => update({ targetType })}
        />
        {search.actorId ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            onClick={() => update({ actorId: undefined })}
          >
            Beheerdersfilter wissen
          </button>
        ) : null}
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtering ? 'Geen regels gevonden' : 'Nog geen logregels'}
          description={
            filtering
              ? 'Geen enkele logregel voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra een beheerder iets wijzigt — een gebruiker blokkeert, een organisatie deactiveert of een rol toekent — verschijnt dat hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-5 pb-4">
          <ol className="flex flex-col divide-y">
            {result.rows.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start gap-x-3 gap-y-1.5 py-3.5 first:pt-0"
              >
                <Badge variant={auditActionBadgeVariant(entry.action)}>
                  {AUDIT_TARGET_TYPE_LABELS[entry.targetType]}
                </Badge>

                <p className="min-w-0 flex-1 text-sm">
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: entry.actor.id }}
                    className="font-semibold hover:underline"
                  >
                    {entry.actor.name}
                  </Link>{' '}
                  <span className="text-muted-foreground">
                    {AUDIT_ACTION_LABELS[entry.action]}
                  </span>{' '}
                  <TargetLink
                    targetType={entry.targetType}
                    targetId={entry.targetId}
                    label={entry.targetLabel}
                  />
                </p>

                <time
                  className="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
                  dateTime={new Date(entry.createdAt).toISOString()}
                >
                  {formatDateTimeNl(entry.createdAt)}
                </time>
              </li>
            ))}
          </ol>

          <Pagination
            meta={result.meta}
            onPageChange={(page) =>
              void navigate({
                search: (previous) => ({ ...previous, page }),
                replace: true,
              })
            }
            onPageSizeChange={(pageSize: PageSize) => update({ pageSize })}
            className="-mx-5 mt-4 px-5"
          />
        </Card>
      )}
    </div>
  )
}
