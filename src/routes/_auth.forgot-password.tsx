import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'

import { requestPasswordReset } from '#/lib/auth-client.ts'
import { forgotPasswordSchema } from '#/lib/validation/auth.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [sent, setSent] = React.useState(false)

  const form = useZodForm({
    schema: forgotPasswordSchema,
    initialValues: { email: '' },
    onSubmit: async (values) => {
      // Better Auth stuurt de e-mail; we tonen altijd dezelfde bevestiging,
      // ook als het adres niet bestaat, om te voorkomen dat we verklappen welke
      // e-mailadressen een account hebben.
      await requestPasswordReset({
        email: values.email,
        redirectTo: '/reset-password',
      })
      setSent(true)
    },
  })

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="text-xl">Controleer je e-mail</CardTitle>
          <CardDescription>
            Als er een account bij dit e-mailadres hoort, hebben we een link
            gestuurd om je wachtwoord opnieuw in te stellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Terug naar inloggen</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Wachtwoord vergeten?</CardTitle>
        <CardDescription>
          Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord
          in te stellen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
          <FormError message={form.formError} />

          <FormField
            id="email"
            label="E-mailadres"
            required
            error={form.errorFor('email')}
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

          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Bezig met versturen…' : 'Stuur reset-link'}
          </Button>
        </form>
      </CardContent>

      <div className="px-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Terug naar inloggen
        </Link>
      </div>
    </Card>
  )
}
