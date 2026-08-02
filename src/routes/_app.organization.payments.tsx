import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'

import { updatePaymentSettings } from '#/server/organization.ts'
import { paymentApps, paymentSettingsSchema } from '#/lib/validation/payment.ts'
import type { PaymentAppValue } from '#/lib/validation/payment.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { toast } from '#/components/ui/sonner.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Label } from '#/components/ui/label.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'

export const Route = createFileRoute('/_app/organization/payments')({
  component: OrganizationPayments,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationPayments() {
  const router = useRouter()
  const { organization } = workspaceRoute.useRouteContext()
  const settings = organization.paymentSettings

  const form = useZodForm({
    schema: paymentSettingsSchema,
    initialValues: {
      whatsappEnabled: settings?.whatsappEnabled ?? false,
      whatsappPhone: settings?.whatsappPhone ?? '',
      whatsappApps: settings?.whatsappApps ?? [],
      bankEnabled: settings?.bankEnabled ?? false,
      bankName: settings?.bankName ?? '',
      accountHolder: settings?.accountHolder ?? '',
      accountNumber: settings?.accountNumber ?? '',
      branch: settings?.branch ?? '',
      paymentInstructions: settings?.paymentInstructions ?? '',
    },
    onSubmit: async (values) => {
      await updatePaymentSettings({ data: values })
      await router.invalidate()
      toast.success('Je betaalinstellingen zijn opgeslagen.')
    },
  })

  function toggleApp(app: PaymentAppValue, checked: boolean) {
    const current = form.values.whatsappApps ?? []
    const next = checked
      ? [...current, app]
      : current.filter((value) => value !== app)
    form.setValue('whatsappApps', next)
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit}>
      <FormError message={form.formError} />

      <p className="text-sm text-muted-foreground">
        Het platform verwerkt zelf geen betalingen. Klanten betalen je
        rechtstreeks; je bevestigt de betaling en het platform geeft de tickets
        uit.
      </p>

      {/* WhatsApp-betaalverzoek */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">WhatsApp-betaalverzoek</CardTitle>
            <CardDescription>
              Je ontvangt de bestelling en stuurt zelf een betaalverzoek via je
              betaalapp.
            </CardDescription>
          </div>
          <Switch
            checked={form.values.whatsappEnabled}
            onCheckedChange={(checked) =>
              form.setValue('whatsappEnabled', checked)
            }
            aria-label="WhatsApp-betaalverzoek inschakelen"
          />
        </CardHeader>
        {form.values.whatsappEnabled ? (
          <CardContent className="flex flex-col gap-4">
            <FormField
              id="whatsappPhone"
              label="WhatsApp-nummer"
              required
              hint="Het nummer waarop je betaalverzoeken verstuurt."
              error={form.errorFor('whatsappPhone')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="tel"
                  value={form.values.whatsappPhone}
                  onChange={(e) =>
                    form.setValue('whatsappPhone', e.target.value)
                  }
                  onBlur={() => form.handleBlur('whatsappPhone')}
                />
              )}
            </FormField>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm leading-none font-medium">
                Betaalapps
                <span className="text-destructive" aria-hidden="true">
                  {' '}
                  *
                </span>
              </legend>
              <p className="text-xs text-muted-foreground">
                Welke apps kun je gebruiken om betaalverzoeken te sturen?
              </p>
              <div className="mt-1 flex flex-col gap-2">
                {paymentApps.map((app) => {
                  const checked = (form.values.whatsappApps ?? []).includes(app)
                  return (
                    <div key={app} className="flex items-center gap-2">
                      <Checkbox
                        id={`app-${app}`}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleApp(app, value === true)
                        }
                      />
                      <Label htmlFor={`app-${app}`} className="font-normal">
                        {app}
                      </Label>
                    </div>
                  )
                })}
              </div>
              {form.errorFor('whatsappApps') ? (
                <p className="text-xs font-medium text-destructive">
                  {form.errorFor('whatsappApps')}
                </p>
              ) : null}
            </fieldset>
          </CardContent>
        ) : null}
      </Card>

      {/* Bankoverschrijving */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Bankoverschrijving</CardTitle>
            <CardDescription>
              Klanten maken het bedrag over en uploaden een betaalbewijs dat je
              controleert.
            </CardDescription>
          </div>
          <Switch
            checked={form.values.bankEnabled}
            onCheckedChange={(checked) => form.setValue('bankEnabled', checked)}
            aria-label="Bankoverschrijving inschakelen"
          />
        </CardHeader>
        {form.values.bankEnabled ? (
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="bankName"
              label="Bank"
              required
              error={form.errorFor('bankName')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.bankName}
                  onChange={(e) => form.setValue('bankName', e.target.value)}
                  onBlur={() => form.handleBlur('bankName')}
                />
              )}
            </FormField>

            <FormField
              id="accountHolder"
              label="Rekeninghouder"
              required
              error={form.errorFor('accountHolder')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.accountHolder}
                  onChange={(e) =>
                    form.setValue('accountHolder', e.target.value)
                  }
                  onBlur={() => form.handleBlur('accountHolder')}
                />
              )}
            </FormField>

            <FormField
              id="accountNumber"
              label="Rekeningnummer"
              required
              error={form.errorFor('accountNumber')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.accountNumber}
                  onChange={(e) =>
                    form.setValue('accountNumber', e.target.value)
                  }
                  onBlur={() => form.handleBlur('accountNumber')}
                />
              )}
            </FormField>

            <FormField
              id="branch"
              label="Bijkantoor"
              error={form.errorFor('branch')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.branch}
                  onChange={(e) => form.setValue('branch', e.target.value)}
                  onBlur={() => form.handleBlur('branch')}
                />
              )}
            </FormField>

            <FormField
              id="paymentInstructions"
              label="Betaalinstructies"
              hint="Extra uitleg die de klant bij het overmaken ziet."
              error={form.errorFor('paymentInstructions')}
              className="sm:col-span-2"
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  rows={3}
                  value={form.values.paymentInstructions}
                  onChange={(e) =>
                    form.setValue('paymentInstructions', e.target.value)
                  }
                  onBlur={() => form.handleBlur('paymentInstructions')}
                />
              )}
            </FormField>
          </CardContent>
        ) : null}
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Bezig met opslaan…' : 'Wijzigingen opslaan'}
        </Button>
      </div>
    </form>
  )
}
