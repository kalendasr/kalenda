import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { createOrder, getCheckoutData } from '#/server/checkout.ts'
import { checkoutSchema } from '#/lib/validation/checkout.ts'
import { decodeSelection } from '#/lib/selection.ts'
import { formatSrd } from '#/lib/money.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { cn } from '#/lib/utils.ts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'

export const Route = createFileRoute('/evenementen/$slug_/afrekenen')({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === 'string' ? search.t : '',
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: async ({ params, deps }) => ({
    data: await getCheckoutData({
      data: { slug: params.slug, items: decodeSelection(deps.t) },
    }),
  }),
  head: () => ({ meta: [{ title: 'Afrekenen · Kalenda' }] }),
  component: Checkout,
})

function Checkout() {
  const { slug } = Route.useParams()
  const { data } = Route.useLoaderData()
  const navigate = useNavigate()

  // Hooks moeten onvoorwaardelijk vóór een early return komen (Rules of Hooks);
  // daarom leiden we de waarden defensief af, ook als de selectie leeg is.
  const methods: Array<'WhatsApp' | 'BankTransfer'> = [
    ...(data?.payment.whatsappEnabled ? (['WhatsApp'] as const) : []),
    ...(data?.payment.bankEnabled ? (['BankTransfer'] as const) : []),
  ]

  const form = useZodForm({
    schema: checkoutSchema,
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      paymentMethod: methods[0] ?? 'WhatsApp',
      paymentApp: data?.payment.whatsappApps[0],
      items: (data?.lines ?? []).map((line) => ({
        ticketTypeId: line.ticketTypeId,
        quantity: line.quantity,
      })),
    },
    onSubmit: async (values) => {
      const order = await createOrder({ data: { ...values, slug } })
      await navigate({
        to: '/bestelling/$orderNumber',
        params: { orderNumber: order.orderNumber },
      })
    },
  })

  if (!data || data.lines.length === 0) {
    return (
      <>
        <PublicHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6"
        >
          <h1 className="text-2xl font-semibold">Geen tickets geselecteerd</h1>
          <p className="mt-2 text-muted-foreground">
            Kies eerst je tickets op de eventpagina.
          </p>
          <Button asChild className="mt-6">
            <Link to="/evenementen/$slug" params={{ slug }}>
              Terug naar het evenement
            </Link>
          </Button>
        </main>
      </>
    )
  }

  return (
    <>
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-(--container-content) px-4 py-8 sm:px-6"
      >
        <Link
          to="/evenementen/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Terug naar {data.event.title}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Afrekenen
        </h1>

        <form
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"
          onSubmit={form.handleSubmit}
        >
          <div className="flex flex-col gap-6">
            <FormError message={form.formError} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jouw gegevens</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="firstName"
                  label="Voornaam"
                  required
                  error={form.errorFor('firstName')}
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      autoComplete="given-name"
                      value={form.values.firstName}
                      onChange={(e) =>
                        form.setValue('firstName', e.target.value)
                      }
                      onBlur={() => form.handleBlur('firstName')}
                    />
                  )}
                </FormField>
                <FormField
                  id="lastName"
                  label="Achternaam"
                  required
                  error={form.errorFor('lastName')}
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      autoComplete="family-name"
                      value={form.values.lastName}
                      onChange={(e) =>
                        form.setValue('lastName', e.target.value)
                      }
                      onBlur={() => form.handleBlur('lastName')}
                    />
                  )}
                </FormField>
                <FormField
                  id="email"
                  label="E-mailadres"
                  required
                  hint="Hierheen sturen we je bestelling en tickets."
                  error={form.errorFor('email')}
                  className="sm:col-span-2"
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      type="email"
                      autoComplete="email"
                      value={form.values.email}
                      onChange={(e) => form.setValue('email', e.target.value)}
                      onBlur={() => form.handleBlur('email')}
                    />
                  )}
                </FormField>
                <FormField
                  id="phone"
                  label="Telefoonnummer"
                  required
                  hint="Voor WhatsApp-contact over je betaling."
                  error={form.errorFor('phone')}
                  className="sm:col-span-2"
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      type="tel"
                      autoComplete="tel"
                      placeholder="+597 …"
                      value={form.values.phone}
                      onChange={(e) => form.setValue('phone', e.target.value)}
                      onBlur={() => form.handleBlur('phone')}
                    />
                  )}
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Betaalmethode</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {methods.map((method) => (
                  <OptionRow
                    key={method}
                    name="paymentMethod"
                    checked={form.values.paymentMethod === method}
                    onSelect={() => form.setValue('paymentMethod', method)}
                    title={
                      method === 'WhatsApp'
                        ? 'Betaalverzoek via WhatsApp'
                        : 'Bankoverschrijving'
                    }
                    description={
                      method === 'WhatsApp'
                        ? 'De organisator stuurt je een betaalverzoek.'
                        : 'Maak het bedrag over en upload je betaalbewijs.'
                    }
                  />
                ))}

                {form.values.paymentMethod === 'WhatsApp' &&
                data.payment.whatsappApps.length > 0 ? (
                  <div className="mt-1 flex flex-col gap-2 border-t pt-3">
                    <p className="text-sm font-medium">
                      Met welke app betaal je?
                    </p>
                    {data.payment.whatsappApps.map((app) => (
                      <OptionRow
                        key={app}
                        name="paymentApp"
                        checked={form.values.paymentApp === app}
                        onSelect={() => form.setValue('paymentApp', app)}
                        title={app}
                      />
                    ))}
                    {form.errorFor('paymentApp') ? (
                      <p className="text-xs font-medium text-destructive">
                        {form.errorFor('paymentApp')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Ordersamenvatting */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Je bestelling</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {data.lines.map((line) => (
                    <li
                      key={line.ticketTypeId}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <span>
                        {line.quantity}× {line.name}
                      </span>
                      <span className="tabular-nums">
                        {formatSrd(line.totalPriceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>Totaal</span>
                  <span className="tabular-nums">
                    {formatSrd(data.subtotalCents)}
                  </span>
                </div>
                <Button
                  type="submit"
                  className="mt-2 w-full"
                  disabled={form.isSubmitting || methods.length === 0}
                >
                  {form.isSubmitting ? 'Bezig…' : 'Bestelling plaatsen'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Je betaalt rechtstreeks aan de organisator. Je tickets volgen
                  na bevestiging.
                </p>
              </CardContent>
            </Card>
          </aside>
        </form>
      </main>
    </>
  )
}

function OptionRow({
  name,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  description?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        {description ? (
          <span className="block text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
