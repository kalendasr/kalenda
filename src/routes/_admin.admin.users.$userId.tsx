import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ShieldCheck, ShieldOff } from 'lucide-react'

import {
  deleteUser,
  getUserDetail,
  setUserBlocked,
  setUserPlatformAdmin,
} from '#/server/admin/users.ts'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl, formatDateTimeNl } from '#/lib/datetime.ts'
import {
  ORDER_STATUS_LABELS,
  effectiveOrderStatus,
  orderStatusBadgeVariant,
} from '#/lib/order-status.ts'
import {
  PAYMENT_STATUS_LABELS,
  paymentStatusBadgeVariant,
} from '#/lib/payment-status.ts'
import { USER_ROLE_LABELS, userRoleBadgeVariant } from '#/lib/admin-labels.ts'
import { errorMessage } from '#/lib/error-message.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/users/$userId')({
  loader: async ({ params }) =>
    getUserDetail({ data: { userId: params.userId } }),
  component: AdminUserDetail,
  pendingComponent: () => <AdminPendingState rows={4} />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

function AdminUserDetail() {
  const { user, role, recentOrders, realisedOrderCount, realisedSpendCents } =
    Route.useLoaderData()
  const { user: admin } = Route.useRouteContext()
  const router = useRouter()

  const isSelf = user.id === admin.id
  const blocked = user.blockedAt !== null
  const deleted = user.deletedAt !== null

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      await router.invalidate()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={[
          { label: 'Gebruikers', to: '/admin/users' },
          { label: user.name },
        ]}
        title={user.name}
        description={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={userRoleBadgeVariant(role)}>
              {USER_ROLE_LABELS[role]}
            </Badge>
            {deleted ? (
              <Badge variant="soft-destructive">Verwijderd</Badge>
            ) : blocked ? (
              <Badge variant="soft-destructive">Geblokkeerd</Badge>
            ) : (
              <Badge variant="soft-success">Actief</Badge>
            )}
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Accountgegevens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Voornaam" value={user.firstName} />
            <Field label="Achternaam" value={user.lastName} />
            <Field label="E-mailadres" value={user.email} />
            <Field
              label="E-mail bevestigd"
              value={user.emailVerified ? 'Ja' : 'Nee'}
            />
            <Field label="Telefoon" value={user.phone ?? 'Niet opgegeven'} />
            <Field label="Tijdzone" value={user.timezone} />
            <Field
              label="Aanmeldmethode"
              value={
                user.accounts.length === 0
                  ? 'Onbekend'
                  : user.accounts
                      .map((account) =>
                        account.providerId === 'credential'
                          ? 'E-mail en wachtwoord'
                          : account.providerId === 'google'
                            ? 'Google'
                            : account.providerId,
                      )
                      .join(', ')
              }
            />
            <Field
              label="Geregistreerd op"
              value={formatDateTimeNl(user.createdAt)}
            />
            {blocked ? (
              <Field
                label="Geblokkeerd sinds"
                value={formatDateTimeNl(user.blockedAt)}
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {user.organization ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organisatie</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link
                  to="/admin/organizations/$organizationId"
                  params={{ organizationId: user.organization.id }}
                  className="font-semibold hover:underline"
                >
                  {user.organization.name}
                </Link>
                <div className="flex flex-wrap gap-2">
                  {user.organization.isVerified ? (
                    <Badge variant="soft-info">Geverifieerd</Badge>
                  ) : null}
                  {user.organization.deletedAt ? (
                    <Badge variant="soft-destructive">Gedeactiveerd</Badge>
                  ) : (
                    <Badge variant="soft-success">Actief</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.organization._count.events} evenementen
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bestelgeschiedenis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-[26px] font-extrabold tracking-[-0.025em] tabular-nums">
                {formatSrd(realisedSpendCents)}
              </p>
              <p className="text-sm text-muted-foreground">
                {realisedOrderCount === 1
                  ? '1 afgeronde bestelling'
                  : `${realisedOrderCount} afgeronde bestellingen`}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recente bestellingen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {recentOrders.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Deze gebruiker heeft nog geen bestellingen geplaatst met dit
              account.
            </p>
          ) : (
            recentOrders.map((order) => {
              const status = effectiveOrderStatus({
                orderStatus: order.orderStatus,
                expiresAt: order.expiresAt,
              })
              return (
                <Link
                  key={order.id}
                  to="/admin/orders/$orderNumber"
                  params={{ orderNumber: order.orderNumber }}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-semibold">
                      {order.orderNumber}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.event.title}
                    </span>
                  </div>
                  <Badge variant={orderStatusBadgeVariant(status)}>
                    {ORDER_STATUS_LABELS[status]}
                  </Badge>
                  <Badge
                    variant={paymentStatusBadgeVariant(order.paymentStatus)}
                  >
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatSrd(order.totalCents)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateNl(order.createdAt)}
                  </span>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beheeracties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Dit is je eigen account. Om te voorkomen dat je jezelf per ongeluk
              buitensluit, kun je je eigen rol, blokkade of account hier niet
              wijzigen — vraag een andere platformbeheerder.
            </p>
          ) : deleted ? (
            <p className="text-sm text-muted-foreground">
              Dit account is verwijderd op {formatDateTimeNl(user.deletedAt)}.
              De bestellingen en tickets blijven bewaard als historie.
            </p>
          ) : (
            <>
              <ActionRow
                title={
                  user.isPlatformAdmin
                    ? 'Beheerdersrol intrekken'
                    : 'Platformbeheerder maken'
                }
                description={
                  user.isPlatformAdmin
                    ? 'Deze gebruiker verliest direct toegang tot de volledige beheeromgeving.'
                    : 'Deze gebruiker krijgt toegang tot alle organisaties, bestellingen en gebruikers op het platform.'
                }
              >
                <ConfirmDialog
                  title={
                    user.isPlatformAdmin
                      ? `Beheerdersrol van ${user.name} intrekken?`
                      : `${user.name} platformbeheerder maken?`
                  }
                  description={
                    user.isPlatformAdmin
                      ? 'De gebruiker verliest onmiddellijk toegang tot /admin. Het account zelf blijft gewoon werken. Deze actie wordt vastgelegd in het logboek.'
                      : 'De gebruiker krijgt volledige inzage in alle organisaties, bestellingen, betalingen en gebruikers, en kan accounts blokkeren. Geef deze rol alleen aan mensen die het platform beheren. Deze actie wordt vastgelegd in het logboek.'
                  }
                  confirmLabel={
                    user.isPlatformAdmin ? 'Rol intrekken' : 'Beheerder maken'
                  }
                  destructive={!user.isPlatformAdmin}
                  onConfirm={() =>
                    run(
                      () =>
                        setUserPlatformAdmin({
                          data: {
                            userId: user.id,
                            isPlatformAdmin: !user.isPlatformAdmin,
                          },
                        }),
                      user.isPlatformAdmin
                        ? 'Beheerdersrol ingetrokken.'
                        : 'Gebruiker is nu platformbeheerder.',
                    )
                  }
                  trigger={
                    <Button variant="outline" size="sm">
                      {user.isPlatformAdmin ? (
                        <ShieldOff className="size-4" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      {user.isPlatformAdmin ? 'Intrekken' : 'Beheerder maken'}
                    </Button>
                  }
                />
              </ActionRow>

              <ActionRow
                title={blocked ? 'Blokkade opheffen' : 'Account blokkeren'}
                description={
                  blocked
                    ? 'De gebruiker kan weer inloggen en bestellingen plaatsen.'
                    : 'De gebruiker kan niet meer inloggen. Bestaande bestellingen en tickets blijven geldig. Omkeerbaar.'
                }
              >
                <ConfirmDialog
                  title={
                    blocked
                      ? `Blokkade van ${user.name} opheffen?`
                      : `${user.name} blokkeren?`
                  }
                  description={
                    blocked
                      ? 'De gebruiker kan direct weer inloggen. Deze actie wordt vastgelegd in het logboek.'
                      : 'De gebruiker wordt uitgelogd en kan niet meer inloggen. Al gekochte tickets blijven geldig en scanbaar. Je kunt dit later terugdraaien. Deze actie wordt vastgelegd in het logboek.'
                  }
                  confirmLabel={blocked ? 'Blokkade opheffen' : 'Blokkeren'}
                  destructive={!blocked}
                  onConfirm={() =>
                    run(
                      () =>
                        setUserBlocked({
                          data: { userId: user.id, blocked: !blocked },
                        }),
                      blocked
                        ? 'Blokkade opgeheven.'
                        : 'Gebruiker geblokkeerd.',
                    )
                  }
                  trigger={
                    <Button variant="outline" size="sm">
                      {blocked ? 'Blokkade opheffen' : 'Blokkeren'}
                    </Button>
                  }
                />
              </ActionRow>

              <ActionRow
                title="Account verwijderen"
                description="Het account wordt gedeactiveerd en de gebruiker kan niet meer inloggen. Bestellingen, betalingen en tickets blijven bewaard als financiële historie."
              >
                <ConfirmDialog
                  title={`Account van ${user.name} verwijderen?`}
                  description="De gebruiker wordt uitgelogd en kan niet meer inloggen. Bestellingen, betalingen en tickets blijven bestaan — die zijn onderdeel van de administratie en worden nooit gewist. Deze actie wordt vastgelegd in het logboek."
                  confirmLabel="Account verwijderen"
                  destructive
                  onConfirm={() =>
                    run(
                      () => deleteUser({ data: { userId: user.id } }),
                      'Account verwijderd.',
                    )
                  }
                  trigger={
                    <Button variant="outline" size="sm">
                      Verwijderen
                    </Button>
                  }
                />
              </ActionRow>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}

function ActionRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
      <div className="max-w-lg min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
