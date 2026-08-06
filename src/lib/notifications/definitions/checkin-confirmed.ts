import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type CheckinConfirmedData = {
  orderNumber: string
  eventTitle: string
}

/** Klant: succesvolle check-in bij binnenkomst (BR-801). */
export const checkinConfirmed = defineNotification<CheckinConfirmedData>({
  key: 'checkin.confirmed',
  label: 'Check-in bevestigd',
  description:
    'Bevestiging aan de klant dat de check-in bij de deur gelukt is.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: `Welkom bij ${truncate(data.eventTitle, 34)}`,
    body: 'Je bent ingecheckt. Veel plezier!',
    url: `/bestelling/${data.orderNumber}`,
    tag: `checkin:${data.orderNumber}`,
  }),
})
