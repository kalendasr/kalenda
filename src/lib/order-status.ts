/**
 * Orderstatus-logica (BR-505/506). Puur en testbaar.
 *
 * Lazy expiry: een onbetaalde order die voorbij zijn `expiresAt` is, geldt als
 * verlopen zonder dat we de database hoeven bij te werken. Zo geven verlopen
 * orders hun gereserveerde tickets vrij (BR-507) en tonen we overal dezelfde
 * effectieve status.
 */

export type OrderStatus =
  | 'PendingPayment'
  | 'AwaitingReview'
  | 'Paid'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'

/** Statussen waarin een order nog op betaling wacht en kan verlopen. */
const PENDING_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'PendingPayment',
  'AwaitingReview',
])

/** Statussen die capaciteit gereserveerd houden. */
const RESERVING_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'PendingPayment',
  'AwaitingReview',
  'Paid',
  'Completed',
])

export function effectiveOrderStatus(
  order: { orderStatus: OrderStatus; expiresAt: Date },
  now: Date = new Date(),
): OrderStatus {
  if (PENDING_STATUSES.has(order.orderStatus) && now > order.expiresAt) {
    return 'Expired'
  }
  return order.orderStatus
}

/** Houdt deze order (rekening houdend met lazy expiry) capaciteit bezet? */
export function isReserving(
  order: { orderStatus: OrderStatus; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return RESERVING_STATUSES.has(effectiveOrderStatus(order, now))
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PendingPayment: 'Wacht op betaling',
  AwaitingReview: 'Wacht op controle',
  Paid: 'Betaald',
  Completed: 'Afgerond',
  Cancelled: 'Geannuleerd',
  Expired: 'Verlopen',
}
