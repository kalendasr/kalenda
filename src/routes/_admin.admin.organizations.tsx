import { useRouter, createFileRoute } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

import {
  listOrganizationsAdmin,
  setOrganizationActive,
} from '#/server/admin.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/organizations')({
  loader: async () => ({
    organizations: await listOrganizationsAdmin(),
  }),
  component: AdminOrganizations,
})

type OrganizationRow = Awaited<
  ReturnType<typeof listOrganizationsAdmin>
>[number]

function OrganizationRow({
  organization,
  onToggle,
}: {
  organization: OrganizationRow
  onToggle: (active: boolean) => Promise<void>
}) {
  const active = organization.deletedAt === null

  return (
    <div className="flex flex-wrap items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{organization.name}</span>
          {organization.isVerified ? (
            <Badge variant="soft-info">Geverifieerd</Badge>
          ) : null}
          {active ? null : (
            <Badge variant="soft-destructive">Gedeactiveerd</Badge>
          )}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {organization.owner.name} · {organization.owner.email}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {organization._count.events}{' '}
        {organization._count.events === 1 ? 'evenement' : 'evenementen'}
      </div>
      <div className="text-sm text-muted-foreground">
        Sinds {formatDateNl(organization.createdAt)}
      </div>
      {active ? (
        <ConfirmDialog
          title={`${organization.name} deactiveren?`}
          description="De organisator kan niet meer inloggen op de workspace en alle gepubliceerde evenementen verdwijnen direct van de website. Je kunt dit later terugdraaien."
          confirmLabel="Deactiveren"
          destructive
          onConfirm={() => onToggle(false)}
          trigger={
            <Button variant="outline" size="sm">
              Deactiveren
            </Button>
          }
        />
      ) : (
        <ConfirmDialog
          title={`${organization.name} heractiveren?`}
          description="De organisator krijgt weer toegang tot de workspace en eerder gepubliceerde evenementen verschijnen weer op de website."
          confirmLabel="Heractiveren"
          onConfirm={() => onToggle(true)}
          trigger={
            <Button variant="outline" size="sm">
              Heractiveren
            </Button>
          }
        />
      )}
    </div>
  )
}

function AdminOrganizations() {
  const { organizations } = Route.useLoaderData()
  const router = useRouter()

  async function handleToggle(organizationId: string, active: boolean) {
    try {
      await setOrganizationActive({ data: { organizationId, active } })
      await router.invalidate()
      toast.success(
        active ? 'Organisatie heractiveerd.' : 'Organisatie gedeactiveerd.',
      )
    } catch {
      toast.error('Actie is niet gelukt.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          Organisaties
        </h1>
        <p className="mt-1 text-muted-foreground">
          Alle organisaties op het platform, met hun eigenaar en status.
        </p>
      </header>

      {organizations.length === 0 ? (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Building2 className="size-6" />
          </span>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold">Nog geen organisaties</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Zodra organisatoren zich registreren en een organisatie aanmaken,
              verschijnen ze hier.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="gap-0 divide-y px-5">
          {organizations.map((organization) => (
            <OrganizationRow
              key={organization.id}
              organization={organization}
              onToggle={(active) => handleToggle(organization.id, active)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
