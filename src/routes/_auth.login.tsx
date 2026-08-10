import { Link, createFileRoute, useLoaderData } from '@tanstack/react-router'

import { signIn } from '#/lib/auth-client.ts'
import { loginSchema } from '#/lib/validation/auth.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { safeRedirect } from '#/lib/safe-redirect.ts'
import { postAuthDestination } from '#/lib/post-auth-destination.ts'
import { loadAppContext } from '#/server/app-context.ts'
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

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: Login,
})

function Login() {
  const { googleEnabled } = useLoaderData({ from: '/_auth' })
  const { redirect: redirectTo } = Route.useSearch()
  const safeRedirectTo = safeRedirect(redirectTo)
  const isCheckoutRedirect = safeRedirectTo?.includes('/afrekenen') ?? false

  const form = useZodForm({
    schema: loginSchema,
    initialValues: { email: '', password: '' },
    onSubmit: async (values) => {
      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      })

      if (error) {
        throw new Error(
          'Het e-mailadres of wachtwoord klopt niet. Probeer het opnieuw.',
        )
      }

      const { organization } = await loadAppContext()
      window.location.href = postAuthDestination({
        redirectTo: safeRedirectTo,
        hasOrganization: Boolean(organization),
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welkom terug</CardTitle>
        <CardDescription>
          {isCheckoutRedirect
            ? 'Log in om je bestelling af te ronden.'
            : 'Log in om verder te gaan.'}
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
            id="password"
            label="Wachtwoord"
            required
            error={form.errorFor('password')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="current-password"
                value={form.values.password}
                onChange={(e) => form.setValue('password', e.target.value)}
                onBlur={() => form.handleBlur('password')}
              />
            )}
          </FormField>

          <div className="-mt-1 text-right text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              Wachtwoord vergeten?
            </Link>
          </div>

          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Bezig met inloggen…' : 'Inloggen'}
          </Button>
        </form>
      </CardContent>

      <div className="px-6 text-center text-sm text-muted-foreground">
        Nog geen account?{' '}
        <Link
          to="/register"
          search={{ redirect: redirectTo }}
          className="font-medium text-primary hover:underline"
        >
          Account aanmaken
        </Link>
      </div>
    </Card>
  )
}
