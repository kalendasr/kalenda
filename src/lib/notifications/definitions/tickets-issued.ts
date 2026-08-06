import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type TicketsIssuedData = {
  orderNumber: string
  eventTitle: string
  ticketCount: number
}

/**
 * Klant: de betaling is bevestigd en de tickets staan klaar (BR-901 + BR-902,
 * die op hetzelfde moment vanuit dezelfde commit vuren — daarom één melding).
 */
export const ticketsIssued = defineNotification<TicketsIssuedData>({
  key: 'tickets.issued',
  label: 'Tickets verwerkt',
  description: 'Bevestiging aan de klant dat de tickets klaarstaan.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Je tickets staan klaar',
    body: `${truncate(data.eventTitle, 40)} · ${data.ticketCount} ${data.ticketCount === 1 ? 'ticket' : 'tickets'}`,
    url: `/bestelling/${data.orderNumber}`,
    tag: `tickets-issued:${data.orderNumber}`,
  }),
})
