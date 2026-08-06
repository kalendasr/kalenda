import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type EventReminderCustomerData = {
  orderNumber: string
  eventTitle: string
  /** Al opgemaakte begintijd + locatie, bijv. "20:00 · Torarica". */
  whenWhere: string
}

/** Klant: herinnering vlak voor het event (de ochtend zelf). */
export const eventReminderCustomer =
  defineNotification<EventReminderCustomerData>({
    key: 'event.reminder.customer',
    label: 'Herinnering vóór het event',
    description: 'Een herinnering aan de klant op de dag van het evenement.',
    audienceKind: 'customer',
    toggleable: false,
    defaultEnabled: true,
    build: (data) => ({
      title: `Vandaag: ${truncate(data.eventTitle, 36)}`,
      body: data.whenWhere,
      url: `/bestelling/${data.orderNumber}`,
      tag: `event-reminder:${data.orderNumber}`,
    }),
  })
