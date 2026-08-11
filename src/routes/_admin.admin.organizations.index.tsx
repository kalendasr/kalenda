import { Link, createFileRoute } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

import { listOrganizations } from '#/server/admin/organizations.ts'
import { listOrganizationsInputSchema } from '#/lib/validation/admin.ts'
import { formatDateNl } from '#/lib/datetime.ts'
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

export const Route = createFileRoute('/_admin/admin/organizations/')({
  validateSearch: listOrganizationsInputSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    result: await listOrganizations({ data: deps }),
  }),
  component: AdminOrganizations,
  pendingComponent: () => <AdminPendingState />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Actief' },
  { value: 'deactivated', label: 'Gedeactiveerd' },
] as const

const VERIFICATION_OPTIONS = [
  { value: 'all', label: 'Alle verificaties' },
  { value: 'verified', label: 'Geverifieerd' },
  { value: 'unverified', label: 'Niet geverifieerd' },
] as const

function AdminOrganizations() {
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
    search.verification !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Organisaties"
        description="Alle organisaties op het platform, met hun eigenaar en status."
      />

      <ListToolbar
        search={search.search ?? ''}
        onSearchChange={(value) => update({ search: value || undefined })}
        placeholder="Zoek op naam, slug of e-mail eigenaar"
      >
        <FilterPills
          label="Status"
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => update({ status })}
        />
        <FilterSelect
          label="Verificatie"
          value={search.verification}
          options={VERIFICATION_OPTIONS}
          onChange={(verification) => update({ verification })}
        />
      </ListToolbar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            filtering ? 'Geen organisaties gevonden' : 'Nog geen organisaties'
          }
          description={
            filtering
              ? 'Geen enkele organisatie voldoet aan deze zoekopdracht en filters. Pas ze aan of wis de zoekterm.'
              : 'Zodra organisatoren zich registreren en een organisatie aanmaken, verschijnen ze hier.'
          }
        />
      ) : (
        <Card className="gap-0 px-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisatie</TableHead>
                <TableHead>Eigenaar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Evenementen</TableHead>
                <TableHead>Sinds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$organizationId"
                      params={{ organizationId: organization.id }}
                      className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="font-semibold">{organization.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        /{organization.slug}
                        {organization.city ? ` · ${organization.city}` : ''}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: organization.owner.id }}
                      className="block rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="text-sm font-medium">
                        {organization.owner.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {organization.owner.email}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {organization.deletedAt ? (
                        <Badge variant="soft-destructive">Gedeactiveerd</Badge>
                      ) : (
                        <Badge variant="soft-success">Actief</Badge>
                      )}
                      {organization.isVerified ? (
                        <Badge variant="soft-info">Geverifieerd</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {organization._count.events}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateNl(organization.createdAt)}
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
