import { defineNotification } from '#/lib/notifications/types.ts'

export type CancellationDeclinedData = {
  orderNumber: string
  eventTitle: string
}

/**
 * Klant: de organisator wijst het annuleringsverzoek af (BR-509). Altijd
 * sturen — wie om annulering vraagt en niets meer hoort, blijft in het
 * ongewisse over een bestelling waar hij misschien nog voor moet betalen.
 */
export const cancellationDeclined =
  defineNotification<CancellationDeclinedData>({
    key: 'cancellation.declined',
    label: 'Annuleringsverzoek afgewezen',
    description:
      'Melding aan de klant dat zijn annuleringsverzoek is afgewezen.',
    audienceKind: 'customer',
    toggleable: false,
    defaultEnabled: true,
    build: (data) => ({
      title: 'Je annuleringsverzoek is afgewezen',
      body: `${data.eventTitle} · je bestelling blijft staan.`,
      url: `/bestelling/${data.orderNumber}`,
      tag: `cancellation-declined:${data.orderNumber}`,
    }),
  })
