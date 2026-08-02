import * as React from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  createContentItem,
  deleteContentItem,
  reorderContentItem,
  updateContentItem,
} from '#/server/event.ts'
import type { EventContentTypeValue } from '#/lib/validation/event.ts'
import { contentItemSchema } from '#/lib/validation/event.ts'
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

function EventContentTab() {
  const { event } = workspaceRoute.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
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
            error={form.errorFor('content')}
          >
            {(aria) => (
              <Textarea
                {...aria}
                rows={4}
                value={form.values.content}
                onChange={(e) => form.setValue('content', e.target.value)}
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
