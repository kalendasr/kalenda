import * as React from 'react'
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ImageIcon, Upload } from 'lucide-react'

import {
  deleteEvent,
  updateEventDetails,
  updateEventVenue,
} from '#/server/event.ts'
import { uploadEventCover } from '#/server/upload.ts'
import { listCategories } from '#/server/categories.ts'
import { eventDetailsSchema, venueSchema } from '#/lib/validation/event.ts'
import { dateToSurinameLocal } from '#/lib/datetime.ts'
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
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/settings')({
  loader: async () => ({ categories: await listCategories() }),
  component: EventSettings,
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')
const NO_CATEGORY = '__none__'

function EventSettings() {
  const { event } = workspaceRoute.useLoaderData()
  const { categories } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <DetailsForm event={event} categories={categories} />
      <VenueForm event={event} />
      <CoverUpload event={event} />
      <DangerZone event={event} />
    </div>
  )
}

type EventData = ReturnType<typeof workspaceRoute.useLoaderData>['event']
type Categories = Array<{ id: string; name: string }>

function DetailsForm({
  event,
  categories,
}: {
  event: EventData
  categories: Categories
}) {
  const router = useRouter()

  const form = useZodForm({
    schema: eventDetailsSchema,
    initialValues: {
      title: event.title,
      shortDescription: event.shortDescription ?? '',
      description: event.description ?? '',
      categoryId: event.categoryId ?? '',
      startsAt: dateToSurinameLocal(event.startsAt),
      endsAt: dateToSurinameLocal(event.endsAt),
      timezone: event.timezone,
    },
    onSubmit: async (values) => {
      await updateEventDetails({ data: { ...values, eventId: event.id } })
      await router.invalidate()
      toast.success('De evenementgegevens zijn opgeslagen.')
    },
  })

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit}>
      <FormError message={form.formError} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Algemeen</CardTitle>
          <CardDescription>
            Titel en omschrijving van je evenement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            id="title"
            label="Titel"
            required
            error={form.errorFor('title')}
          >
            {(aria) => (
              <Input
                {...aria}
                value={form.values.title}
                onChange={(e) => form.setValue('title', e.target.value)}
                onBlur={() => form.handleBlur('title')}
              />
            )}
          </FormField>

          <FormField
            id="shortDescription"
            label="Korte omschrijving"
            hint="Eén zin die op de kaart en bovenaan de pagina verschijnt."
            error={form.errorFor('shortDescription')}
          >
            {(aria) => (
              <Input
                {...aria}
                value={form.values.shortDescription}
                onChange={(e) =>
                  form.setValue('shortDescription', e.target.value)
                }
                onBlur={() => form.handleBlur('shortDescription')}
              />
            )}
          </FormField>

          <FormField
            id="description"
            label="Omschrijving"
            error={form.errorFor('description')}
          >
            {(aria) => (
              <Textarea
                {...aria}
                rows={6}
                value={form.values.description}
                onChange={(e) => form.setValue('description', e.target.value)}
                onBlur={() => form.handleBlur('description')}
              />
            )}
          </FormField>

          <FormField
            id="category"
            label="Categorie"
            error={form.errorFor('categoryId')}
          >
            {(aria) => (
              <Select
                value={form.values.categoryId || NO_CATEGORY}
                onValueChange={(value) =>
                  form.setValue(
                    'categoryId',
                    value === NO_CATEGORY ? '' : value,
                  )
                }
              >
                <SelectTrigger
                  id={aria.id}
                  aria-describedby={aria['aria-describedby']}
                >
                  <SelectValue placeholder="Kies een categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Geen categorie</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datum en tijd</CardTitle>
          <CardDescription>
            Tijden gelden in de tijdzone van Suriname.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="startsAt"
            label="Startdatum en -tijd"
            error={form.errorFor('startsAt')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="datetime-local"
                value={form.values.startsAt}
                onChange={(e) => form.setValue('startsAt', e.target.value)}
                onBlur={() => form.handleBlur('startsAt')}
              />
            )}
          </FormField>

          <FormField
            id="endsAt"
            label="Einddatum en -tijd"
            error={form.errorFor('endsAt')}
          >
            {(aria) => (
              <Input
                {...aria}
                type="datetime-local"
                value={form.values.endsAt}
                onChange={(e) => form.setValue('endsAt', e.target.value)}
                onBlur={() => form.handleBlur('endsAt')}
              />
            )}
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Bezig met opslaan…' : 'Gegevens opslaan'}
        </Button>
      </div>
    </form>
  )
}

function VenueForm({ event }: { event: EventData }) {
  const router = useRouter()

  const form = useZodForm({
    schema: venueSchema,
    initialValues: {
      name: event.venue?.name ?? '',
      address: event.venue?.address ?? '',
      district: event.venue?.district ?? '',
      country: event.venue?.country ?? 'Suriname',
    },
    onSubmit: async (values) => {
      await updateEventVenue({ data: { ...values, eventId: event.id } })
      await router.invalidate()
      toast.success('De locatie is opgeslagen.')
    },
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Locatie</CardTitle>
          <CardDescription>Waar vindt het evenement plaats?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormError message={form.formError} />
          <FormField
            id="venueName"
            label="Naam locatie"
            required
            error={form.errorFor('name')}
            className="sm:col-span-2"
          >
            {(aria) => (
              <Input
                {...aria}
                placeholder="Bijvoorbeeld: Kwaku Festivalterrein"
                value={form.values.name}
                onChange={(e) => form.setValue('name', e.target.value)}
                onBlur={() => form.handleBlur('name')}
              />
            )}
          </FormField>

          <FormField
            id="venueAddress"
            label="Adres"
            error={form.errorFor('address')}
            className="sm:col-span-2"
          >
            {(aria) => (
              <Input
                {...aria}
                value={form.values.address}
                onChange={(e) => form.setValue('address', e.target.value)}
                onBlur={() => form.handleBlur('address')}
              />
            )}
          </FormField>

          <FormField
            id="venueDistrict"
            label="District"
            error={form.errorFor('district')}
          >
            {(aria) => (
              <Input
                {...aria}
                value={form.values.district}
                onChange={(e) => form.setValue('district', e.target.value)}
                onBlur={() => form.handleBlur('district')}
              />
            )}
          </FormField>

          <FormField
            id="venueCountry"
            label="Land"
            required
            error={form.errorFor('country')}
          >
            {(aria) => (
              <Input
                {...aria}
                value={form.values.country}
                onChange={(e) => form.setValue('country', e.target.value)}
                onBlur={() => form.handleBlur('country')}
              />
            )}
          </FormField>

          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Bezig met opslaan…' : 'Locatie opslaan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function CoverUpload({ event }: { event: EventData }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('eventId', event.id)

    setUploading(true)
    try {
      await uploadEventCover({ data: formData })
      await router.invalidate()
      toast.success('De coverfoto is bijgewerkt.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Uploaden is niet gelukt.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coverfoto</CardTitle>
        <CardDescription>
          Breed beeld bovenaan de eventpagina. PNG, JPG of WebP, max 5 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {uploading
              ? 'Bezig met uploaden…'
              : event.coverImage
                ? 'Vervangen'
                : 'Afbeelding kiezen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DangerZone({ event }: { event: EventData }) {
  const navigate = useNavigate()
  const router = useRouter()

  if (event.status !== 'Draft') return null

  async function handleDelete() {
    try {
      await deleteEvent({ data: { eventId: event.id } })
      await router.invalidate()
      toast.success('Het concept is verwijderd.')
      await navigate({ to: '/events' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Verwijderen mislukt.',
      )
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Concept verwijderen</CardTitle>
          <CardDescription>
            Verwijder dit concept definitief. Dit kan niet ongedaan worden.
          </CardDescription>
        </div>
        <ConfirmDialog
          title="Concept verwijderen?"
          description="Dit evenement wordt definitief verwijderd. Deze actie kan niet ongedaan worden gemaakt."
          confirmLabel="Verwijderen"
          destructive
          onConfirm={handleDelete}
          trigger={
            <Button variant="destructive" size="sm">
              Verwijderen
            </Button>
          }
        />
      </CardHeader>
    </Card>
  )
}
