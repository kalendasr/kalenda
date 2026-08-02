import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { resetPassword } from '#/lib/auth-client.ts'
import { toast } from '#/components/ui/sonner.tsx'
import { resetPasswordSchema } from '#/lib/validation/auth.ts'
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

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const navigate = useNavigate()
  const { token, error } = Route.useSearch()

  const invalidLink = !token || Boolean(error)

  const form = useZodForm({
    schema: resetPasswordSchema,
    initialValues: { password: '', confirmPassword: '' },
    onSubmit: async (values) => {
      if (!token) {
        throw new Error(
          'Deze link is niet meer geldig. Vraag een nieuwe reset-link aan.',
        )
      }

      const { error: resetError } = await resetPassword({
        newPassword: values.password,
        token,
      })

      if (resetError) {
        throw new Error(
          'Deze link is niet meer geldig. Vraag een nieuwe reset-link aan.',
        )
      }

      toast.success(
        'Je wachtwoord is gewijzigd. Log in met je nieuwe wachtwoord.',
      )
      await navigate({ to: '/login' })
    },
  })

  if (invalidLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Link is verlopen</CardTitle>
          <CardDescription>
            Deze reset-link is niet meer geldig. Vraag een nieuwe aan om je
            wachtwoord opnieuw in te stellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Nieuwe link aanvragen</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Kies een nieuw wachtwoord</CardTitle>
        <CardDescription>
          Stel een nieuw wachtwoord in voor je account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
          <FormError message={form.formError} />

          <FormField
            id="password"
            label="Nieuw wachtwoord"
            required
            hint="Minimaal 12 tekens."
            error={form.errorFor('password')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="new-password"
                value={form.values.password}
                onChange={(e) => form.setValue('password', e.target.value)}
                onBlur={() => form.handleBlur('password')}
              />
            )}
          </FormField>

          <FormField
            id="confirmPassword"
            label="Herhaal wachtwoord"
            required
            error={form.errorFor('confirmPassword')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="new-password"
                value={form.values.confirmPassword}
                onChange={(e) =>
                  form.setValue('confirmPassword', e.target.value)
                }
                onBlur={() => form.handleBlur('confirmPassword')}
              />
            )}
          </FormField>

          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Bezig met opslaan…' : 'Wachtwoord opslaan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
