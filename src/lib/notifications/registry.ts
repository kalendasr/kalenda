/**
 * De registry: de complete lijst notificatietypen.
 *
 * Een tiende type toevoegen = één bestand in `definitions/` maken en één regel
 * aan `NOTIFICATIONS` toevoegen. Verder niets: het instellingenscherm rendert
 * uit deze map, en `notify()` leidt zijn data-type hieruit af.
 *
 * BEWUST GÉÉN type in deze lijst:
 * - Een push per scan: de scanner-operator kijkt al naar het scherm.
 * - Wachtwoord-reset e.d.: dat is geen push-materie.
 *
 * PUUR: dit bestand en alles eronder importeren nooit de database of web-push.
 */
import { cancellationDeclined } from '#/lib/notifications/definitions/cancellation-declined.ts'
import { cancellationRequested } from '#/lib/notifications/definitions/cancellation-requested.ts'
import { checkinConfirmed } from '#/lib/notifications/definitions/checkin-confirmed.ts'
import { eventChanged } from '#/lib/notifications/definitions/event-changed.ts'
import { eventReminderCustomer } from '#/lib/notifications/definitions/event-reminder-customer.ts'
import { orderCancelled } from '#/lib/notifications/definitions/order-cancelled.ts'
import { orderCreated } from '#/lib/notifications/definitions/order-created.ts'
import { organizerMessage } from '#/lib/notifications/definitions/organizer-message.ts'
import { paymentRejected } from '#/lib/notifications/definitions/payment-rejected.ts'
import { paymentRequested } from '#/lib/notifications/definitions/payment-requested.ts'
import { paymentSubmitted } from '#/lib/notifications/definitions/payment-submitted.ts'
import { scanUnusual } from '#/lib/notifications/definitions/scan-unusual.ts'
import { ticketsIssued } from '#/lib/notifications/definitions/tickets-issued.ts'
import { ticketsLowStock } from '#/lib/notifications/definitions/tickets-low-stock.ts'

export const NOTIFICATIONS = {
  // Voor de organisator.
  'order.created': orderCreated,
  'payment.submitted': paymentSubmitted,
  'tickets.low_stock': ticketsLowStock,
  'cancellation.requested': cancellationRequested,
  'scan.unusual': scanUnusual,
  // Voor de klant.
  'tickets.issued': ticketsIssued,
  'payment.requested': paymentRequested,
  'payment.rejected': paymentRejected,
  'order.cancelled': orderCancelled,
  'cancellation.declined': cancellationDeclined,
  'event.reminder.customer': eventReminderCustomer,
  'event.changed': eventChanged,
  'checkin.confirmed': checkinConfirmed,
  'organizer.message': organizerMessage,
} as const

export type NotificationKey = keyof typeof NOTIFICATIONS

export const NOTIFICATION_KEYS = Object.keys(
  NOTIFICATIONS,
) as Array<NotificationKey>

/**
 * Het data-type per sleutel, afgeleid uit de `build`-functie van elke definitie.
 * Hierdoor vangt `notify('order.created', ..., data)` een verkeerde data-vorm
 * meteen op bij het typechecken.
 */
export type NotificationData = {
  [K in NotificationKey]: Parameters<(typeof NOTIFICATIONS)[K]['build']>[0]
}

/** Alle definities die een organisator in het beheerscherm kan aan/uit zetten. */
export function organizerToggleableDefinitions() {
  return NOTIFICATION_KEYS.map((key) => NOTIFICATIONS[key]).filter(
    (def) => def.audienceKind === 'organizer' && def.toggleable,
  )
}
