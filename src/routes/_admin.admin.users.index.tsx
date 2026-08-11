import { Link, createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'

import { listUsers } from '#/server/admin/users.ts'
import { listUsersInputSchema } from '#/lib/validation/admin.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { USER_ROLE_LABELS, userRoleBadgeVariant } from '#/lib/admin-labels.ts'
import type { PageSize } from '#/lib/pagination.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  FilterPills,
  FilterSelect,
  ListToolbar,
} from '#/components/app/admin/list-toolbar.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
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

export const Route = createFileRoute('/_admin/admin/users/')({
  validateSearch: listUsersInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({ result: await listUsers({ data: deps }) }),
  component: AdminUsers,
  pendingComponent: () => <AdminPendingState />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actief' },
  { value: 'blocked', label: 'Geblokkeerd' },
  { value: 'deleted', label: 'Verwijderd' },
  { value: 'all', label: 'Alle' },
] as const

const ROLE_OPTIONS = [
  { value: 'all', label: 'Alle rollen' },
  { value: 'platformAdmin', label: 'Platformbeheerders' },
  { value: 'organizer', label: 'Organisatoren' },
  { value: 'customer', label: 'Klanten' },
] as const

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registratiedatum' },
  { value: 'name', label: 'Naam' },
  { value: 'email', label: 'E-mail' },
] as const

function AdminUsers() {
  const { result } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  /** Elke filterwijziging zet de paginering terug naar pagina 1. */
  function update(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, page: 1, ...patch }),
      replace: true,
    })
  }

  const filtering =
    Boolean(search.search) ||
    search.role !== 'all' ||
    search.status !== 'active'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Gebruikers"
        description="Alle accounts op het platform. Rol en organisatie worden afgeleid uit het account zelf."
      />

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op naam of e-mail"
      >
        <FilterPills
          label="Accountstatus"
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => update({ status })}
        />
        <FilterSelect
          label="Rol"
          value={search.role}
          options={ROLE_OPTIONS}
          onChange={(role) => update({ role })}
        />
        <FilterSelect
          label="Sorteren"
          value={search.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => update({ sort })}
        />
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtering ? 'Geen gebruikers gevonden' : 'Nog geen gebruikers'}
          description={
            filtering
              ? 'Geen enkel account voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra mensen zich registreren of een bestelling plaatsen, verschijnen hun accounts hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gebruiker</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Bestellingen</TableHead>
                <TableHead>Sinds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((account) => {
                const role = account.isPlatformAdmin
                  ? 'platformAdmin'
                  : account.organization
                    ? 'organizer'
                    : 'customer'

                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: account.id }}
                        className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="font-semibold">{account.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {account.email}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userRoleBadgeVariant(role)}>
                        {USER_ROLE_LABELS[role]}
                      </Badge>
                      {account.organization ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {account.organization.name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {account.deletedAt ? (
                        <Badge variant="soft-destructive">Verwijderd</Badge>
                      ) : account.blockedAt ? (
                        <Badge variant="soft-destructive">Geblokkeerd</Badge>
                      ) : account.emailVerified ? (
                        <Badge variant="soft-success">Actief</Badge>
                      ) : (
                        <Badge variant="soft-warning">E-mail onbevestigd</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {account._count.orders}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateNl(account.createdAt)}
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
