import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

/** Welke materiële wijziging is er aan het event gedaan? */
export type EventChange = 'time' | 'venue' | 'cancelled'

export type EventChangedData = {
  orderNumber: string
  eventTitle: string
  change: EventChange
}

const CHANGE_BODY: Record<EventChange, string> = {
  time: 'De begintijd is aangepast. Bekijk de nieuwe details.',
  venue: 'De locatie is aangepast. Bekijk de nieuwe details.',
  cancelled: 'Dit evenement is geannuleerd.',
}

/**
 * Klant: een materiële wijziging aan het event (tijd, locatie of annulering).
 * Wordt bewust NIET verstuurd bij kleine tekstwijzigingen — de aanroepplek
 * bepaalt of er echt iets relevants veranderd is.
 */
export const eventChanged = defineNotification<EventChangedData>({
  key: 'event.changed',
  label: 'Wijziging aan het event',
  description:
    'Laat de klant weten als de tijd of locatie verandert of het event vervalt.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title:
      data.change === 'cancelled'
        ? `Geannuleerd: ${truncate(data.eventTitle, 32)}`
        : `Wijziging: ${truncate(data.eventTitle, 34)}`,
    body: CHANGE_BODY[data.change],
    url: `/bestelling/${data.orderNumber}`,
    tag: `event-changed:${data.orderNumber}:${data.change}`,
  }),
})
