/**
 * Orderstatus-logica (BR-505/506). Puur en testbaar.
 *
 * Lazy expiry: een onbetaalde order die voorbij zijn `expiresAt` is, geldt als
 * verlopen zonder dat we de database hoeven bij te werken. Zo geven verlopen
 * orders hun gereserveerde tickets vrij (BR-507) en tonen we overal dezelfde
 * effectieve status.
 *
 * Zodra een klant betaalbewijs indient (`AwaitingReview`) verloopt de order
 * niet meer vanzelf: de oorspronkelijke deadline was bedoeld om klanten te
 * ontmoedigen die nooit betalen, niet om organisatoren te straffen die traag
 * controleren. Vanaf dat moment ligt de beslissing bij de organisator
 * (BR-607) — de order blijft dus zichtbaar en houdt capaciteit bezet totdat
 * die order goed- of afgekeurd wordt.
 */

export type OrderStatus =
  | 'PendingPayment'
  | 'AwaitingReview'
  | 'Paid'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'

/**
 * Statussen die als gerealiseerde verkoop tellen — de enige bron van waarheid
 * voor "omzet", zowel in de organisatorrapportage als op platformniveau.
 *
 * Bewust smal: `PendingPayment` en `AwaitingReview` zijn nog geen geld,
 * `Cancelled` en `Expired` worden het nooit meer. Wie hier een status aan
 * toevoegt, verandert elk omzetcijfer in de applicatie tegelijk — dat is
 * precies de bedoeling.
 */
export const REALISED_ORDER_STATUSES = ['Paid', 'Completed'] as const

/** Status waarin een order nog geen actie van de klant kent en kan verlopen. */
const EXPIRABLE_STATUSES: ReadonlySet<OrderStatus> = new Set(['PendingPayment'])

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
  if (EXPIRABLE_STATUSES.has(order.orderStatus) && now > order.expiresAt) {
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

/** Badgevariant per status — één bron van waarheid voor alle statusbadges. */
export function orderStatusBadgeVariant(
  status: OrderStatus,
): 'soft-success' | 'soft-warning' | 'soft-destructive' | 'soft-muted' {
  if (status === 'Paid' || status === 'Completed') return 'soft-success'
  if (status === 'AwaitingReview') return 'soft-warning'
  if (status === 'Cancelled' || status === 'Expired') return 'soft-destructive'
  return 'soft-muted'
}
