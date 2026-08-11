import { useRouter, createFileRoute } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'

import { listUsersAdmin, setUserBlocked } from '#/server/admin.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/users')({
  loader: async () => ({ users: await listUsersAdmin() }),
  component: AdminUsers,
})

type UserRow = Awaited<ReturnType<typeof listUsersAdmin>>[number]

function UserRow({
  user,
  currentUserId,
  onToggle,
}: {
  user: UserRow
  currentUserId: string
  onToggle: (blocked: boolean) => Promise<void>
}) {
  const blocked = user.blockedAt !== null
  const role = user.isPlatformAdmin
    ? 'Platformbeheerder'
    : user.organization
      ? `Organisator (${user.organization.name})`
      : 'Klant/Bezoeker'

  return (
    <div className="flex flex-wrap items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{user.name}</span>
          {blocked ? (
            <Badge variant="soft-destructive">Geblokkeerd</Badge>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {user.email} · {role}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Sinds {formatDateNl(user.createdAt)}
      </div>
      {user.isPlatformAdmin || user.id === currentUserId ? null : blocked ? (
        <ConfirmDialog
          title={`${user.name} deblokkeren?`}
          description="De gebruiker kan weer inloggen en het platform gebruiken."
          confirmLabel="Deblokkeren"
          onConfirm={() => onToggle(false)}
          trigger={
            <Button variant="outline" size="sm">
              Deblokkeren
            </Button>
          }
        />
      ) : (
        <ConfirmDialog
          title={`${user.name} blokkeren?`}
          description="De gebruiker wordt direct uitgelogd en kan niet meer inloggen totdat je de blokkade opheft. Bestaande orders en tickets blijven bewaard."
          confirmLabel="Blokkeren"
          destructive
          onConfirm={() => onToggle(true)}
          trigger={
            <Button variant="outline" size="sm">
              Blokkeren
            </Button>
          }
        />
      )}
    </div>
  )
}

function AdminUsers() {
  const { user: currentUser } = Route.useRouteContext()
  const { users } = Route.useLoaderData()
  const router = useRouter()

  async function handleToggle(userId: string, blocked: boolean) {
    try {
      await setUserBlocked({ data: { userId, blocked } })
      await router.invalidate()
      toast.success(
        blocked ? 'Gebruiker geblokkeerd.' : 'Gebruiker gedeblokkeerd.',
      )
    } catch {
      toast.error('Actie is niet gelukt.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          Gebruikers
        </h1>
        <p className="mt-1 text-muted-foreground">
          Alle geregistreerde gebruikers, met hun rol op het platform.
        </p>
      </header>

      {users.length === 0 ? (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-6" />
          </span>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold">Nog geen gebruikers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Zodra mensen zich registreren, verschijnen ze hier.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="gap-0 divide-y px-5">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentUserId={currentUser.id}
              onToggle={(blocked) => handleToggle(user.id, blocked)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
