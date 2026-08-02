import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
} from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
})

type SetupStep = {
  id: string
  label: string
  description: string
  to: string
  done: boolean
}

function Dashboard() {
  const { user, organization } = Route.useRouteContext()

  const hasContact = Boolean(
    organization.email || organization.phone || organization.description,
  )
  const hasPaymentMethod = Boolean(
    organization.paymentSettings?.whatsappEnabled ||
    organization.paymentSettings?.bankEnabled,
  )

  const steps: Array<SetupStep> = [
    {
      id: 'general',
      label: 'Vul je organisatiegegevens aan',
      description: 'Beschrijving en contactgegevens die bezoekers zien.',
      to: '/organization/general',
      done: hasContact,
    },
    {
      id: 'payments',
      label: 'Stel een betaalmethode in',
      description: 'WhatsApp-betaalverzoek of bankoverschrijving.',
      to: '/organization/payments',
      done: hasPaymentMethod,
    },
  ]

  const remaining = steps.filter((step) => !step.done)
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welkom, {firstName}
        </h1>
        <p className="text-muted-foreground">{organization.name}</p>
      </header>

      {remaining.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rond je instellingen af</CardTitle>
            <CardDescription>
              Nog {remaining.length}{' '}
              {remaining.length === 1 ? 'stap' : 'stappen'} voordat je klaar
              bent om evenementen te publiceren.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {steps.map((step) => (
              <Link
                key={step.id}
                to={step.to}
                className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      step.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                {!step.done ? (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Je organisatie is klaar
            </CardTitle>
            <CardDescription>
              Je gegevens en betaalmethode staan ingesteld. Evenementen en
              ticketverkoop komen in de volgende fase.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          to="/organization/general"
          icon={Building2}
          title="Organisatiegegevens"
          description="Naam, beschrijving, contact en sociale media."
        />
        <QuickLink
          to="/organization/payments"
          icon={CreditCard}
          title="Betaalinstellingen"
          description="WhatsApp en bankoverschrijving beheren."
        />
      </section>
    </div>
  )
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  )
}
