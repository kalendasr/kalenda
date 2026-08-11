import { defineNotification } from '#/lib/notifications/types.ts'

export type OrderCancelledData = {
  orderNumber: string
  eventTitle: string
}

/**
 * Klant: de organisator heeft de bestelling geannuleerd. Altijd sturen — een
 * geannuleerde bestelling verdwijnt uit de verkoop en de klant moet weten dat
 * hij niet meer op zijn tickets hoeft te wachten.
 */
export const orderCancelled = defineNotification<OrderCancelledData>({
  key: 'order.cancelled',
  label: 'Bestelling geannuleerd',
  description: 'Melding aan de klant dat zijn bestelling is geannuleerd.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Je bestelling is geannuleerd',
    body: `${data.eventTitle} · bekijk de reden op je bestelpagina.`,
    url: `/bestelling/${data.orderNumber}`,
    tag: `order-cancelled:${data.orderNumber}`,
  }),
})
