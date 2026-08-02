import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CreditCard, Pencil } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
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

  const contactRows = [
    { label: 'E-mail', value: organization.email },
    { label: 'Telefoon', value: organization.phone },
    { label: 'Website', value: organization.website },
    {
      label: 'Plaats',
      value: [organization.city, organization.country]
        .filter(Boolean)
        .join(', '),
    },
  ].filter((row) => Boolean(row.value))

  return (
    <div className="flex flex-col gap-4">
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
            {organization.description ? (
              <CardDescription className="mt-1 line-clamp-2">
                {organization.description}
              </CardDescription>
            ) : (
              <CardDescription className="mt-1">
                Nog geen beschrijving toegevoegd.
              </CardDescription>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/organization/general">
              <Pencil /> Bewerken
            </Link>
          </Button>
        </CardHeader>
        {contactRows.length > 0 ? (
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {contactRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="truncate text-sm">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CreditCard className="size-4" />
          </span>
          <div className="flex-1">
            <CardTitle className="text-base">Betaalmethoden</CardTitle>
            <CardDescription>Hoe klanten je kunnen betalen.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/organization/payments">
              <Pencil /> Beheren
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {payments?.whatsappEnabled ? (
            <Badge variant="secondary">
              WhatsApp
              {payments.whatsappApps.length > 0
                ? ` · ${payments.whatsappApps.join(', ')}`
                : ''}
            </Badge>
          ) : null}
          {payments?.bankEnabled ? (
            <Badge variant="secondary">Bankoverschrijving</Badge>
          ) : null}
          {!payments?.whatsappEnabled && !payments?.bankEnabled ? (
            <p className="text-sm text-muted-foreground">
              Nog geen betaalmethode ingesteld.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
