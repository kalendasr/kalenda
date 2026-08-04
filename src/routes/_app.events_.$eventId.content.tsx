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
  updateEventIntro,
} from '#/server/event.ts'
import { uploadEventCover } from '#/server/upload.ts'
import type { EventContentTypeValue } from '#/lib/validation/event.ts'
import { contentItemSchema, eventIntroSchema } from '#/lib/validation/event.ts'
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
import { RichTextEditor } from '#/components/ui/rich-text-editor.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/content')({
  component: EventContentTab,
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

type ContentItem = {
  id: string
  type: string
  title: string
  content: string
}

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

type EventData = ReturnType<typeof workspaceRoute.useLoaderData>['event']

function EventContentTab() {
  const { event } = workspaceRoute.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <CoverUpload event={event} />
      <IntroForm event={event} />
      {SECTIONS.map((section) => (
        <ContentSection
          key={section.type}
          eventId={event.id}
          section={section}
          items={event.content.filter((item) => item.type === section.type)}
        />
      ))}
    </div>
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

function IntroForm({ event }: { event: EventData }) {
  const router = useRouter()

  const form = useZodForm({
    schema: eventIntroSchema,
    initialValues: {
      shortDescription: event.shortDescription ?? '',
      description: event.description ?? '',
    },
    onSubmit: async (values) => {
      await updateEventIntro({ data: { ...values, eventId: event.id } })
      await router.invalidate()
      toast.success('De introductie is opgeslagen.')
    },
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Introductie</CardTitle>
          <CardDescription>
            Wat bezoekers als eerste lezen op de eventpagina.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
              {form.isSubmitting ? 'Bezig met opslaan…' : 'Introductie opslaan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
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
