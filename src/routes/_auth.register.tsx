import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { signUp } from '#/lib/auth-client.ts'
import { registerSchema } from '#/lib/validation/auth.ts'
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

export const Route = createFileRoute('/_auth/register')({ component: Register })

function Register() {
  const navigate = useNavigate()

  const form = useZodForm({
    schema: registerSchema,
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
    onSubmit: async (values) => {
      const { error } = await signUp.email({
        email: values.email,
        password: values.password,
        name: `${values.firstName} ${values.lastName}`.trim(),
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      })

      if (error) {
        throw new Error(
          error.message ??
            'We konden geen account aanmaken. Probeer het opnieuw.',
        )
      }

      await navigate({ to: '/dashboard' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Maak je account aan</CardTitle>
        <CardDescription>
          Begin met het beheren van je evenementen en tickets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
          <FormError message={form.formError} />

          <div className="grid grid-cols-2 gap-3">
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
                  onChange={(e) => form.setValue('firstName', e.target.value)}
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
                  onChange={(e) => form.setValue('lastName', e.target.value)}
                  onBlur={() => form.handleBlur('lastName')}
                />
              )}
            </FormField>
          </div>

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

          <FormField
            id="phone"
            label="Telefoonnummer"
            hint="Optioneel. Handig voor WhatsApp-contact."
            error={form.errorFor('phone')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="tel"
                autoComplete="tel"
                value={form.values.phone}
                onChange={(e) => form.setValue('phone', e.target.value)}
                onBlur={() => form.handleBlur('phone')}
              />
            )}
          </FormField>

          <FormField
            id="password"
            label="Wachtwoord"
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

          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Bezig met aanmaken…' : 'Account aanmaken'}
          </Button>
        </form>
      </CardContent>

      <div className="px-6 text-center text-sm text-muted-foreground">
        Heb je al een account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Inloggen
        </Link>
      </div>
    </Card>
  )
}
