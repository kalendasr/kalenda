import { Link, createFileRoute, useLoaderData } from '@tanstack/react-router'

import { signUp } from '#/lib/auth-client.ts'
import { registerSchema } from '#/lib/validation/auth.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { safeRedirect } from '#/lib/safe-redirect.ts'
import { postAuthDestination } from '#/lib/post-auth-destination.ts'
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
import { GoogleSignInButton } from '#/components/auth/google-signin-button.tsx'

export const Route = createFileRoute('/_auth/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: Register,
})

function Register() {
  const { googleEnabled } = useLoaderData({ from: '/_auth' })
  const { redirect: redirectTo } = Route.useSearch()
  const safeRedirectTo = safeRedirect(redirectTo)
  const isCheckoutRedirect = safeRedirectTo?.includes('/afrekenen') ?? false

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

      // Een nieuw account heeft nooit al een organisatie.
      window.location.href = postAuthDestination({
        redirectTo: safeRedirectTo,
        hasOrganization: false,
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Maak je account aan</CardTitle>
        <CardDescription>
          {isCheckoutRedirect
            ? 'Maak een account aan om je bestelling af te ronden.'
            : 'Eén account voor het kopen van tickets én het organiseren van evenementen.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <GoogleSignInButton
            enabled={googleEnabled}
            callbackURL={postAuthDestination({
              redirectTo: safeRedirectTo,
              hasOrganization: false,
            })}
          />

          {googleEnabled && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              of
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
        </div>

        <form className="mt-4 flex flex-col gap-4" onSubmit={form.handleSubmit}>
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
        <Link
          to="/login"
          search={{ redirect: redirectTo }}
          className="font-medium text-primary hover:underline"
        >
          Inloggen
        </Link>
      </div>
    </Card>
  )
}
