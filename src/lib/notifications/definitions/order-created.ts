import { formatSrd } from '#/lib/money.ts'
import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type OrderCreatedData = {
  eventId: string
  eventTitle: string
  orderNumber: string
  totalCents: number
}

/** Organisator: er is een nieuwe bestelling binnengekomen (BR-900). */
export const orderCreated = defineNotification<OrderCreatedData>({
  key: 'order.created',
  label: 'Nieuwe bestelling',
  description: 'Zodra iemand tickets bestelt voor een van je evenementen.',
  audienceKind: 'organizer',
  toggleable: true,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Nieuwe bestelling',
    body: `${truncate(data.eventTitle, 40)} · ${formatSrd(data.totalCents)}`,
    url: `/events/${data.eventId}/orders`,
    tag: `order-created:${data.orderNumber}`,
  }),
})
