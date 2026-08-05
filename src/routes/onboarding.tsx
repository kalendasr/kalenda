import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { createOrganization } from '#/server/organization.ts'
import { loadAppContext } from '#/server/app-context.ts'
import { createOrganizationSchema } from '#/lib/validation/organization.ts'
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

/**
 * Onboarding: de eerste organisatie aanmaken. Geen sidebar/navigatie — een
 * gefocust scherm met één taak (DESIGN_SYSTEM.md §2), wel in hetzelfde
 * ontwerpsysteem als de app (`.app-shell`). Ingelogde gebruikers die al een
 * organisatie hebben, gaan direct naar het dashboard.
 */
export const Route = createFileRoute('/onboarding')({
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  beforeLoad: async () => {
    const { user, organization } = await loadAppContext()
    if (!user) throw redirect({ to: '/login' })
    if (organization) throw redirect({ to: '/dashboard' })
  },
  component: Onboarding,
})

function Onboarding() {
  const navigate = useNavigate()
  const router = useRouter()

  const form = useZodForm({
    schema: createOrganizationSchema,
    initialValues: { name: '' },
    onSubmit: async (values) => {
      await createOrganization({ data: values })
      // Nieuwe organisatie: context verversen zodat de guards hem zien.
      await router.invalidate()
      await navigate({ to: '/dashboard' })
    },
  })

  return (
    <main
      id="main"
      className="app-shell flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12 text-foreground"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-primary/10">
            <CalendarDays
              className="size-[17px] text-primary"
              aria-hidden="true"
            />
          </span>
          <span className="text-[18px] font-extrabold tracking-[-0.02em]">
            Kalenda
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[20px]">
              Maak je organisatie aan
            </CardTitle>
            <CardDescription>
              Je organisatie is de eigenaar van je evenementen en tickets. Je
              kunt de overige gegevens later aanvullen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
              <FormError message={form.formError} />

              <FormField
                id="name"
                label="Naam van je organisatie"
                required
                hint="Bijvoorbeeld je bedrijfs- of stichtingsnaam."
                error={form.errorFor('name')}
              >
                {(aria) => (
                  <Input
                    {...aria}
                    autoComplete="organization"
                    value={form.values.name}
                    onChange={(e) => form.setValue('name', e.target.value)}
                    onBlur={() => form.handleBlur('name')}
                  />
                )}
              </FormField>

              <Button type="submit" disabled={form.isSubmitting}>
                {form.isSubmitting
                  ? 'Bezig met aanmaken…'
                  : 'Organisatie aanmaken'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
