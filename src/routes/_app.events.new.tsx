import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'

import { createEvent } from '#/server/event.ts'
import { createEventSchema } from '#/lib/validation/event.ts'
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

export const Route = createFileRoute('/_app/events/new')({
  component: NewEvent,
})

const WIZARD_STEPS = [
  {
    n: '1',
    title: 'Details',
    body: 'Naam, datum, locatie, beschrijving en flyer — precies de tab waar je later ook bewerkt.',
  },
  {
    n: '2',
    title: 'Tickets',
    body: 'Soorten, prijzen, capaciteit en verkoopperiode.',
  },
  {
    n: '3',
    title: 'Publiceren',
    body: 'Controleer je publieke pagina en zet het evenement live.',
  },
] as const

function NewEvent() {
  const navigate = useNavigate()
  const router = useRouter()

  const form = useZodForm({
    schema: createEventSchema,
    initialValues: { title: '' },
    onSubmit: async (values) => {
      const event = await createEvent({ data: values })
      await router.invalidate()
      // Direct door naar Details om de rest in te vullen.
      await navigate({
        to: '/events/$eventId/details',
        params: { eventId: event.id },
      })
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          Nieuw evenement
        </h1>
        <p className="mt-1 text-muted-foreground">
          Drie stappen tot je eerste ticket: details, tickets, publiceren.
          Dezelfde indeling als de tabs op een bestaand evenement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {WIZARD_STEPS.map((step) => (
          <div
            key={step.n}
            className="rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
              {step.n}
            </div>
            <div className="mt-3 text-sm font-semibold tracking-tight">
              {step.title}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-pretty text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Beginnen met details</CardTitle>
          <CardDescription>
            Geef je evenement een titel. De overige gegevens vul je daarna in de
            workspace aan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
            <FormError message={form.formError} />

            <FormField
              id="title"
              label="Titel"
              required
              error={form.errorFor('title')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  autoFocus
                  placeholder="Bijvoorbeeld: Owru Yari Festival 2026"
                  value={form.values.title}
                  onChange={(e) => form.setValue('title', e.target.value)}
                  onBlur={() => form.handleBlur('title')}
                />
              )}
            </FormField>

            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Bezig met aanmaken…' : 'Evenement aanmaken'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
