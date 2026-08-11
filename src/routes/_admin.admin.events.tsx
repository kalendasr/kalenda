import { useRouter, createFileRoute } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { archiveEventAdmin, listEventsAdmin } from '#/server/admin.ts'
import { formatDateTimeShortNl } from '#/lib/datetime.ts'
import { EventStatusBadge } from '#/components/app/event-status-badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/events')({
  loader: async () => ({ events: await listEventsAdmin() }),
  component: AdminEvents,
})

type EventRow = Awaited<ReturnType<typeof listEventsAdmin>>[number]

function EventRow({
  event,
  onArchive,
}: {
  event: EventRow
  onArchive: () => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{event.title}</span>
          <EventStatusBadge
            status={event.status}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
          />
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {event.organization.name}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {event._count.orders} {event._count.orders === 1 ? 'order' : 'orders'}
      </div>
      <div className="text-sm text-muted-foreground">
        {event.startsAt ? formatDateTimeShortNl(event.startsAt) : 'Geen datum'}
      </div>
      {event.status !== 'Archived' ? (
        <ConfirmDialog
          title={`${event.title} archiveren?`}
          description="Het evenement wordt van de website gehaald. De organisator kan het zelf niet meer terugzetten naar concept — dat kan alleen via het platformbeheer."
          confirmLabel="Archiveren"
          destructive
          onConfirm={onArchive}
          trigger={
            <Button variant="outline" size="sm">
              Archiveren
            </Button>
          }
        />
      ) : null}
    </div>
  )
}

function AdminEvents() {
  const { events } = Route.useLoaderData()
  const router = useRouter()

  async function handleArchive(eventId: string) {
    try {
      await archiveEventAdmin({ data: { eventId } })
      await router.invalidate()
      toast.success('Evenement gearchiveerd.')
    } catch {
      toast.error('Actie is niet gelukt.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          Evenementen
        </h1>
        <p className="mt-1 text-muted-foreground">
          Alle evenementen op het platform, over alle organisaties heen.
        </p>
      </header>

      {events.length === 0 ? (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarDays className="size-6" />
          </span>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold">Nog geen evenementen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Zodra organisatoren evenementen aanmaken, verschijnen ze hier.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="gap-0 divide-y px-5">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onArchive={() => handleArchive(event.id)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
