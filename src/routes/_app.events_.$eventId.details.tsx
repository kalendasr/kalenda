import * as React from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

import {
  createContentItem,
  deleteContentItem,
  reorderContentItem,
  updateContentItem,
  updateEventDetails,
  updateEventIntro,
  updateEventVenue,
} from '#/server/event.ts'
import { listCategories } from '#/server/categories.ts'
import { uploadEventCover } from '#/server/upload.ts'
import type { EventContentTypeValue } from '#/lib/validation/event.ts'
import {
  contentItemSchema,
  eventDetailsSchema,
  eventIntroSchema,
  venueSchema,
} from '#/lib/validation/event.ts'
import { dateToSurinameLocal } from '#/lib/datetime.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { cn } from '#/lib/utils.ts'
import { toast } from '#/components/ui/sonner.tsx'
import { errorMessage } from '#/lib/error-message.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { RichTextEditor } from '#/components/ui/rich-text-editor.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import {
  RouteErrorState,
  RoutePendingState,
} from '#/components/app/route-states.tsx'

/**
 * Details-tab: alles wat bezoekers van dit evenement zien staat op één plek —
 * basisgegevens, locatie, beschrijving, media, programma-inhoud en de publieke
 * pagina. Vervangt de losse tabs Inhoud en (deels) Instellingen.
 */
export const Route = createFileRoute('/_app/events_/$eventId/details')({
  loader: async () => ({ categories: await listCategories() }),
  component: EventDetailsTab,
  pendingComponent: () => <RoutePendingState rows={5} />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')
const NO_CATEGORY = '__none__'

type EventData = ReturnType<typeof workspaceRoute.useLoaderData>['event']
type Categories = Array<{ id: string; name: string }>
type ContentItem = { id: string; type: string; title: string; content: string }

const SECTIONS: Array<{
  type: EventContentTypeValue
  title: string
  description: string
  itemLabel: string
}> = [
  {
    type: 'Agenda',
    title: 'Agenda',
    description: 'Het programma of tijdschema van je evenement.',
    itemLabel: 'programmapunt',
  },
  {
    type: 'Speaker',
    title: 'Sprekers',
    description: 'Artiesten, sprekers of gasten.',
    itemLabel: 'spreker',
  },
  {
    type: 'Faq',
    title: 'Veelgestelde vragen',
    description: 'Antwoorden op vragen die bezoekers vaak hebben.',
    itemLabel: 'vraag',
  },
  {
    type: 'Rules',
    title: 'Huisregels',
    description: 'Regels en voorwaarden voor bezoekers.',
    itemLabel: 'huisregel',
  },
]

function EventDetailsTab() {
  const { event } = workspaceRoute.useLoaderData()
  const { categories } = Route.useLoaderData()

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-pretty text-muted-foreground">
        Alles wat bezoekers van dit evenement zien staat op deze pagina —
        basisgegevens, beschrijving, media en de publieke pagina.
      </p>

      <BasicsForm event={event} categories={categories} />
      <VenueForm event={event} />
      <CoverAndIntro event={event} />
      {SECTIONS.map((section) => (
        <ContentSection
          key={section.type}
          eventId={event.id}
          section={section}
          items={event.content.filter((item) => item.type === section.type)}
        />
      ))}
      <PublicPageSection event={event} />
    </div>
  )
}

function BasicsForm({
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
    <form onSubmit={form.handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basisgegevens</CardTitle>
          <CardDescription>
            Titel, categorie en wanneer je evenement plaatsvindt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormError message={form.formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="title"
              label="Naam"
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
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Bezig met opslaan…' : 'Gegevens opslaan'}
            </Button>
          </div>
        </CardContent>
      </Card>
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

function CoverAndIntro({ event }: { event: EventData }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  const form = useZodForm({
    schema: eventIntroSchema,
    initialValues: {
      shortDescription: event.shortDescription ?? '',
      description: event.description ?? '',
    },
    onSubmit: async (values) => {
      await updateEventIntro({ data: { ...values, eventId: event.id } })
      await router.invalidate()
      toast.success('De beschrijving is opgeslagen.')
    },
  })

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
      toast.error(errorMessage(error, 'Uploaden is niet gelukt.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beschrijving en media</CardTitle>
        <CardDescription>
          Wat bezoekers als eerste zien op de eventpagina.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 sm:items-start">
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit}
          id="intro-form"
        >
          <FormError message={form.formError} />
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
            hint="Ondersteunt **vet**, *cursief*, links en lijsten."
            error={form.errorFor('description')}
          >
            {(aria) => (
              <RichTextEditor
                {...aria}
                rows={6}
                value={form.values.description ?? ''}
                onChange={(value) => form.setValue('description', value)}
                onBlur={() => form.handleBlur('description')}
              />
            )}
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting
                ? 'Bezig met opslaan…'
                : 'Beschrijving opslaan'}
            </Button>
          </div>
        </form>

        <div>
          <span className="text-sm font-medium">Omslagafbeelding</span>
          <div className="mt-2 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border bg-muted">
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
            className="mt-3 w-full"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {uploading
              ? 'Bezig met uploaden…'
              : event.coverImage
                ? 'Afbeelding vervangen'
                : 'Afbeelding kiezen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ContentSection({
  eventId,
  section,
  items,
}: {
  eventId: string
  section: (typeof SECTIONS)[number]
  items: Array<ContentItem>
}) {
  const router = useRouter()

  async function move(itemId: string, direction: 'up' | 'down') {
    await reorderContentItem({ data: { eventId, itemId, direction } })
    await router.invalidate()
  }

  async function remove(itemId: string) {
    await deleteContentItem({ data: { eventId, itemId } })
    await router.invalidate()
    toast.success('Verwijderd.')
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{section.title}</CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </div>
        <ContentItemDialog
          eventId={eventId}
          type={section.type}
          itemLabel={section.itemLabel}
          trigger={
            <Button variant="outline" size="sm">
              <Plus /> Toevoegen
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen {section.itemLabel} toegevoegd.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-3 py-3 first:pt-0"
              >
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Omhoog"
                    disabled={index === 0}
                    onClick={() => move(item.id, 'up')}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Omlaag"
                    disabled={index === items.length - 1}
                    onClick={() => move(item.id, 'down')}
                  >
                    <ChevronDown />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">
                    {item.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <ContentItemDialog
                    eventId={eventId}
                    type={section.type}
                    itemLabel={section.itemLabel}
                    item={item}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Bewerken"
                      >
                        <Pencil />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    title={`${section.itemLabel} verwijderen?`}
                    description="Dit onderdeel wordt verwijderd van de eventpagina."
                    confirmLabel="Verwijderen"
                    destructive
                    onConfirm={() => remove(item.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Verwijderen"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ContentItemDialog({
  eventId,
  type,
  itemLabel,
  item,
  trigger,
}: {
  eventId: string
  type: EventContentTypeValue
  itemLabel: string
  item?: ContentItem
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(item)

  const form = useZodForm({
    schema: contentItemSchema,
    initialValues: {
      type,
      title: item?.title ?? '',
      content: item?.content ?? '',
    },
    onSubmit: async (values) => {
      if (item) {
        await updateContentItem({
          data: {
            eventId,
            itemId: item.id,
            title: values.title,
            content: values.content,
          },
        })
      } else {
        await createContentItem({ data: { ...values, eventId } })
      }
      await router.invalidate()
      toast.success(isEdit ? 'Bijgewerkt.' : 'Toegevoegd.')
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `${itemLabel} bewerken` : `${itemLabel} toevoegen`}
          </DialogTitle>
          <DialogDescription>
            Deze informatie verschijnt op de publieke eventpagina.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
          <FormError message={form.formError} />

          <FormField
            id="itemTitle"
            label="Titel"
            required
            error={form.errorFor('title')}
          >
            {(aria) => (
              <Input
                {...aria}
                autoFocus
                value={form.values.title}
                onChange={(e) => form.setValue('title', e.target.value)}
                onBlur={() => form.handleBlur('title')}
              />
            )}
          </FormField>

          <FormField
            id="itemContent"
            label="Inhoud"
            required
            hint="Ondersteunt **vet**, *cursief*, links en lijsten."
            error={form.errorFor('content')}
          >
            {(aria) => (
              <RichTextEditor
                {...aria}
                rows={4}
                value={form.values.content}
                onChange={(value) => form.setValue('content', value)}
                onBlur={() => form.handleBlur('content')}
              />
            )}
          </FormField>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Bezig…' : isEdit ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Publieke-pagina-instellingen. Overgekomen uit Instellingen. De publieke URL
 * is echt (de slug); de zichtbaarheidsschakelaars zijn in deze ronde nog
 * front-end-only (persistentie volgt in een vervolgronde).
 */
function PublicPageSection({ event }: { event: EventData }) {
  const [toggles, setToggles] = React.useState({
    agenda: true,
    hideSold: false,
    comments: false,
  })

  const rows: Array<{
    key: keyof typeof toggles
    title: string
    sub: string
  }> = [
    {
      key: 'agenda',
      title: 'Zichtbaar in de agenda',
      sub: 'Verschijnt in zoekresultaten en op categoriepagina’s.',
    },
    {
      key: 'hideSold',
      title: 'Uitverkochte soorten verbergen',
      sub: 'Toon alleen wat nog te koop is.',
    },
    {
      key: 'comments',
      title: 'Reacties toestaan',
      sub: 'Bezoekers kunnen op je eventpagina reageren.',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publieke pagina</CardTitle>
        <CardDescription>
          Hoe dit evenement op kalenda.sr verschijnt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center gap-4 py-3 first:pt-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{row.title}</span>
              <span className="block text-sm text-muted-foreground">
                {row.sub}
              </span>
            </span>
            <TogglePill
              on={toggles[row.key]}
              onToggle={() =>
                setToggles((t) => ({ ...t, [row.key]: !t[row.key] }))
              }
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              Link naar je evenement
            </span>
            <span className="font-eyebrow block text-xs text-muted-foreground">
              kalenda.sr/evenementen/{event.slug}
            </span>
          </span>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/evenementen/${event.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Bekijken
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TogglePill({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={cn(
        'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
        on
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-input bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {on ? 'Aan' : 'Uit'}
    </button>
  )
}
