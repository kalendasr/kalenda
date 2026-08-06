import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type TicketsLowStockData = {
  eventId: string
  ticketTypeName: string
  /** Resterend aantal. 0 = volledig uitverkocht. */
  remaining: number
}

/**
 * Organisator: een tickettype is bijna op of uitverkocht. Eén definitie voor
 * beide gevallen — `build` splitst op `remaining === 0`.
 */
export const ticketsLowStock = defineNotification<TicketsLowStockData>({
  key: 'tickets.low_stock',
  label: 'Bijna uitverkocht',
  description: 'Als de voorraad van een tickettype opraakt of uitverkocht is.',
  audienceKind: 'organizer',
  toggleable: true,
  defaultEnabled: true,
  build: (data) => {
    const name = truncate(data.ticketTypeName, 40)
    const soldOut = data.remaining === 0
    return {
      title: soldOut ? 'Uitverkocht' : 'Bijna uitverkocht',
      body: soldOut
        ? `${name} is uitverkocht.`
        : `${name}: nog ${data.remaining} ${data.remaining === 1 ? 'ticket' : 'tickets'}.`,
      url: `/events/${data.eventId}/tickets`,
      tag: `low-stock:${data.eventId}:${data.ticketTypeName}`,
    }
  },
})
