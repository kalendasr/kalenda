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

function NewEvent() {
  const navigate = useNavigate()
  const router = useRouter()

  const form = useZodForm({
    schema: createEventSchema,
    initialValues: { title: '' },
    onSubmit: async (values) => {
      const event = await createEvent({ data: values })
      await router.invalidate()
      // Direct door naar de workspace om de rest in te vullen.
      await navigate({ to: '/events/$eventId', params: { eventId: event.id } })
    },
  })

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nieuw evenement</CardTitle>
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
