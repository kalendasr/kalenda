import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type CancellationRequestedData = {
  eventId: string
  orderNumber: string
  reason: string
}

/** Organisator: een klant vraagt om annulering / terugbetaling van een bestelling. */
export const cancellationRequested =
  defineNotification<CancellationRequestedData>({
    key: 'cancellation.requested',
    label: 'Annuleringsverzoek',
    description: 'Als een klant vraagt om zijn bestelling te annuleren.',
    audienceKind: 'organizer',
    toggleable: true,
    defaultEnabled: true,
    build: (data) => ({
      title: 'Annuleringsverzoek',
      body: `#${data.orderNumber} · ${truncate(data.reason, 60)}`,
      url: `/events/${data.eventId}/orders`,
      tag: `cancellation-requested:${data.orderNumber}`,
    }),
  })
