import * as React from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Ticket,
  Trash2,
} from 'lucide-react'

import {
  createTicketType,
  deleteTicketType,
  reorderTicketType,
  setTicketTypeVisibility,
  updateTicketType,
} from '#/server/ticket-type.ts'
import { ticketTypeSchema } from '#/lib/validation/ticket-type.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { centsToInput, formatSrd } from '#/lib/money.ts'
import { dateToSurinameLocal, formatDateNl } from '#/lib/datetime.ts'
import { ticketSaleStatus } from '#/lib/ticket-sales.ts'
import type { SaleStatus } from '#/lib/ticket-sales.ts'
import { toast } from '#/components/ui/sonner.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Badge } from '#/components/ui/badge.tsx'
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

export const Route = createFileRoute('/_app/events_/$eventId/tickets')({
  component: EventTicketsTab,
})

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

type TicketType = ReturnType<
  typeof workspaceRoute.useLoaderData
>['event']['ticketTypes'][number]

const STATUS_LABELS: Record<SaleStatus, string> = {
  'on-sale': 'In verkoop',
  'not-started': 'Nog niet gestart',
  ended: 'Verkoop gesloten',
  'sold-out': 'Uitverkocht',
  hidden: 'Verborgen',
}

function EventTicketsTab() {
  const { event } = workspaceRoute.useLoaderData()
  const ticketTypes = event.ticketTypes

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bepaal wat bezoekers kunnen kopen: prijs, capaciteit en
          verkoopperiode.
        </p>
        {ticketTypes.length > 0 ? (
          <TicketTypeDialog
            eventId={event.id}
            trigger={
              <Button size="sm">
                <Plus /> Nieuw tickettype
              </Button>
            }
          />
        ) : null}
      </div>

      {ticketTypes.length === 0 ? (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Ticket className="size-6" />
          </span>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold">Nog geen tickettypes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Voeg minimaal één tickettype toe voordat je je evenement kunt
              publiceren.
            </p>
          </div>
          <TicketTypeDialog
            eventId={event.id}
            trigger={
              <Button>
                <Plus /> Nieuw tickettype
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {ticketTypes.map((type, index) => (
            <TicketTypeRow
              key={type.id}
              eventId={event.id}
              type={type}
              isFirst={index === 0}
              isLast={index === ticketTypes.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TicketTypeRow({
  eventId,
  type,
  isFirst,
  isLast,
}: {
  eventId: string
  type: TicketType
  isFirst: boolean
  isLast: boolean
}) {
  const router = useRouter()
  const status = ticketSaleStatus(type)

  async function act(action: () => Promise<unknown>, message?: string) {
    try {
      await action()
      await router.invalidate()
      if (message) toast.success(message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis.')
    }
  }

  const salesWindow = [
    type.salesStart ? `vanaf ${formatDateNl(type.salesStart)}` : null,
    type.salesEnd ? `tot ${formatDateNl(type.salesEnd)}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Omhoog"
          disabled={isFirst}
          onClick={() =>
            act(() =>
              reorderTicketType({
                data: { eventId, ticketTypeId: type.id, direction: 'up' },
              }),
            )
          }
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Omlaag"
          disabled={isLast}
          onClick={() =>
            act(() =>
              reorderTicketType({
                data: { eventId, ticketTypeId: type.id, direction: 'down' },
              }),
            )
          }
        >
          <ChevronDown />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{type.name}</span>
          <Badge variant={status === 'on-sale' ? 'secondary' : 'outline'}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatSrd(type.priceCents)}
          </span>
          <span>{type.quantity} beschikbaar</span>
          <span>
            {type.minimumPerOrder}–{type.maximumPerOrder} per bestelling
          </span>
          {salesWindow ? <span>{salesWindow}</span> : null}
        </div>
        {type.description ? (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {type.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Zichtbaar</span>
          <Switch
            checked={type.visible}
            onCheckedChange={(visible) =>
              act(
                () =>
                  setTicketTypeVisibility({
                    data: { eventId, ticketTypeId: type.id, visible },
                  }),
                visible ? 'Zichtbaar gemaakt.' : 'Verborgen.',
              )
            }
            aria-label="Zichtbaar op de eventpagina"
          />
        </label>
        <TicketTypeDialog
          eventId={eventId}
          type={type}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Bewerken">
              <Pencil />
            </Button>
          }
        />
        <ConfirmDialog
          title="Tickettype verwijderen?"
          description="Dit tickettype wordt verwijderd. Deze actie kan niet ongedaan worden gemaakt."
          confirmLabel="Verwijderen"
          destructive
          onConfirm={() =>
            act(
              () =>
                deleteTicketType({
                  data: { eventId, ticketTypeId: type.id },
                }),
              'Tickettype verwijderd.',
            )
          }
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Verwijderen">
              <Trash2 />
            </Button>
          }
        />
      </div>
    </li>
  )
}

function TicketTypeDialog({
  eventId,
  type,
  trigger,
}: {
  eventId: string
  type?: TicketType
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(type)

  const form = useZodForm({
    schema: ticketTypeSchema,
    initialValues: {
      name: type?.name ?? '',
      description: type?.description ?? '',
      price: type ? centsToInput(type.priceCents) : '',
      quantity: type?.quantity ?? 100,
      minimumPerOrder: type?.minimumPerOrder ?? 1,
      maximumPerOrder: type?.maximumPerOrder ?? 10,
      salesStart: dateToSurinameLocal(type?.salesStart ?? null),
      salesEnd: dateToSurinameLocal(type?.salesEnd ?? null),
      visible: type?.visible ?? true,
    },
    onSubmit: async (values) => {
      if (type) {
        await updateTicketType({
          data: { ...values, eventId, ticketTypeId: type.id },
        })
      } else {
        await createTicketType({ data: { ...values, eventId } })
      }
      await router.invalidate()
      toast.success(
        isEdit ? 'Tickettype bijgewerkt.' : 'Tickettype toegevoegd.',
      )
      setOpen(false)
    },
  })

  const numberField =
    (field: 'quantity' | 'minimumPerOrder' | 'maximumPerOrder') =>
    (value: string) =>
      form.setValue(field, value === '' ? 0 : Number(value))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Tickettype bewerken' : 'Nieuw tickettype'}
          </DialogTitle>
          <DialogDescription>
            Bijvoorbeeld Regular, VIP of Early Bird.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
          <FormError message={form.formError} />

          <FormField
            id="tName"
            label="Naam"
            required
            error={form.errorFor('name')}
          >
            {(aria) => (
              <Input
                {...aria}
                autoFocus
                value={form.values.name}
                onChange={(e) => form.setValue('name', e.target.value)}
                onBlur={() => form.handleBlur('name')}
              />
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="tPrice"
              label="Prijs (SRD)"
              required
              hint="0 voor gratis."
              error={form.errorFor('price')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  inputMode="decimal"
                  placeholder="50,00"
                  value={form.values.price}
                  onChange={(e) => form.setValue('price', e.target.value)}
                  onBlur={() => form.handleBlur('price')}
                />
              )}
            </FormField>

            <FormField
              id="tQuantity"
              label="Capaciteit"
              required
              error={form.errorFor('quantity')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  min={1}
                  value={form.values.quantity}
                  onChange={(e) => numberField('quantity')(e.target.value)}
                  onBlur={() => form.handleBlur('quantity')}
                />
              )}
            </FormField>

            <FormField
              id="tMin"
              label="Min. per bestelling"
              error={form.errorFor('minimumPerOrder')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  min={1}
                  value={form.values.minimumPerOrder}
                  onChange={(e) =>
                    numberField('minimumPerOrder')(e.target.value)
                  }
                  onBlur={() => form.handleBlur('minimumPerOrder')}
                />
              )}
            </FormField>

            <FormField
              id="tMax"
              label="Max. per bestelling"
              error={form.errorFor('maximumPerOrder')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  min={1}
                  value={form.values.maximumPerOrder}
                  onChange={(e) =>
                    numberField('maximumPerOrder')(e.target.value)
                  }
                  onBlur={() => form.handleBlur('maximumPerOrder')}
                />
              )}
            </FormField>

            <FormField
              id="tSalesStart"
              label="Verkoop start"
              error={form.errorFor('salesStart')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="datetime-local"
                  value={form.values.salesStart}
                  onChange={(e) => form.setValue('salesStart', e.target.value)}
                  onBlur={() => form.handleBlur('salesStart')}
                />
              )}
            </FormField>

            <FormField
              id="tSalesEnd"
              label="Verkoop eindigt"
              error={form.errorFor('salesEnd')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="datetime-local"
                  value={form.values.salesEnd}
                  onChange={(e) => form.setValue('salesEnd', e.target.value)}
                  onBlur={() => form.handleBlur('salesEnd')}
                />
              )}
            </FormField>
          </div>

          <FormField
            id="tDescription"
            label="Omschrijving"
            error={form.errorFor('description')}
          >
            {(aria) => (
              <Textarea
                {...aria}
                rows={2}
                value={form.values.description}
                onChange={(e) => form.setValue('description', e.target.value)}
                onBlur={() => form.handleBlur('description')}
              />
            )}
          </FormField>

          <label className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">Direct zichtbaar</span>
            <Switch
              checked={form.values.visible}
              onCheckedChange={(v) => form.setValue('visible', v)}
              aria-label="Direct zichtbaar op de eventpagina"
            />
          </label>

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
