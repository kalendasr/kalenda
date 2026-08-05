import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CheckCircle2, CircleAlert, Pencil } from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_app/organization/')({
  component: OrganizationOverview,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationOverview() {
  const { organization } = workspaceRoute.useRouteContext()
  const payments = organization.paymentSettings

  const hasContact = Boolean(
    organization.email || organization.phone || organization.description,
  )
  const hasBranding = Boolean(organization.logo)
  const hasPaymentMethod = Boolean(
    payments?.whatsappEnabled || payments?.bankEnabled,
  )

  const facts = [
    { label: 'E-mail', value: organization.email ?? '—' },
    { label: 'Telefoon', value: organization.phone ?? '—' },
    {
      label: 'Plaats',
      value:
        [organization.city, organization.country].filter(Boolean).join(', ') ||
        '—',
    },
    {
      label: 'Actief sinds',
      value: new Intl.DateTimeFormat('nl-NL', {
        month: 'long',
        year: 'numeric',
      }).format(organization.createdAt),
    },
  ]

  const setup: Array<{ title: string; done: boolean; to?: string }> = [
    {
      title: 'Contactgegevens ingevuld',
      done: hasContact,
      to: '/organization/details',
    },
    {
      title: 'Logo geüpload',
      done: hasBranding,
      to: '/organization/details',
    },
    {
      title: 'Betaalmethode actief',
      done: hasPaymentMethod,
      to: '/organization/payments',
    },
    {
      title: organization.isVerified
        ? 'Organisatie geverifieerd'
        : 'Verificatie nog niet gestart',
      done: organization.isVerified,
      to: '/organization/settings',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {!organization.isVerified ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CircleAlert className="size-5 shrink-0 text-warning" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              Nog één stap: verifieer je organisatie
            </span>
            <span className="block text-sm text-muted-foreground">
              Upload je KKF-uittreksel om je organisatie te verifiëren.
            </span>
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/organization/settings">Verifiëren</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Avatar className="size-14 rounded-lg">
              {organization.logo ? (
                <AvatarImage
                  src={organization.logo}
                  alt={`Logo van ${organization.name}`}
                />
              ) : null}
              <AvatarFallback className="rounded-lg">
                {organization.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>{organization.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {organization.description ??
                  'Nog geen beschrijving toegevoegd.'}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/organization/details">
                <Pencil /> Bewerken
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base">
              Zo staat je organisatie ervoor
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y border-t px-0">
            {setup.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 px-5 py-3"
              >
                {item.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <CircleAlert className="size-5 shrink-0 text-warning" />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm font-medium',
                    item.done && 'text-muted-foreground',
                  )}
                >
                  {item.title}
                </span>
                {!item.done && item.to ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.to}>Starten</Link>
                  </Button>
                ) : item.done ? (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Klaar
                  </span>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
