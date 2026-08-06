import type { PaymentMethod, PaymentState } from '#/generated/prisma/client.ts'

import { effectiveOrderStatus } from '#/lib/order-status.ts'
import type { OrderStatus } from '#/lib/order-status.ts'

/**
 * Eén afgeleide fase per order (Fase 9).
 *
 * `OrderStatus` (op Order) en `PaymentState` (op Payment) zijn allebei nodig om
 * de workflow correct bij te houden, maar een organisator hoeft er maar één
 * ding uit af te lezen: "wat is nu de situatie, en wat moet ik doen?". Eerder
 * toonden we beide statussen naast elkaar — vaak met (bijna) dezelfde tekst
 * ("Wacht op betaling" · "Wacht op betaling"). Deze module is de enige plek
 * die de twee bronnen combineert tot één weergave; schermen mogen voortaan
 * geen `ORDER_STATUS_LABELS` of `PAYMENT_STATE_LABELS` los meer renderen.
 *
 * Puur en testbaar, zelfde patroon als order-status.ts en payment-transitions.ts.
 */

export type OrderStage =
  | 'NewOrder'
  | 'PaymentRequested'
  | 'AwaitingTransfer'
  | 'ProofSubmitted'
  | 'ProofRejected'
  | 'TicketsPending'
  | 'Done'
  | 'Expired'
  | 'Cancelled'

export type OrderStageInput = {
  orderStatus: OrderStatus
  expiresAt: Date
  paymentMethod: PaymentMethod
  payment: { state: PaymentState } | null
  /** Heeft er al minstens één ticket een `sentAt`? */
  ticketsSent: boolean
}

export const ORDER_STAGE_LABELS: Record<OrderStage, string> = {
  NewOrder: 'Nieuwe bestelling',
  PaymentRequested: 'Betaalverzoek verstuurd',
  AwaitingTransfer: 'Wacht op overschrijving',
  ProofSubmitted: 'Bewijs ontvangen',
  ProofRejected: 'Afgekeurd — wacht op nieuw bewijs',
  TicketsPending: 'Betaald — tickets nog niet verstuurd',
  Done: 'Afgerond',
  Expired: 'Verlopen',
  Cancelled: 'Geannuleerd',
}

/** Badgevariant per fase — de enige plek die orderbadges kleurt. */
export function orderStageBadgeVariant(
  stage: OrderStage,
):
  | 'soft-info'
  | 'soft-success'
  | 'soft-warning'
  | 'soft-destructive'
  | 'soft-muted' {
  switch (stage) {
    case 'NewOrder':
      return 'soft-info'
    case 'ProofSubmitted':
    case 'TicketsPending':
      return 'soft-warning'
    case 'Done':
      return 'soft-success'
    case 'ProofRejected':
    case 'Expired':
    case 'Cancelled':
      return 'soft-destructive'
    default:
      return 'soft-muted'
  }
}

/** Leidt de ene, ondubbelzinnige fase van een order af. */
export function deriveOrderStage(
  order: OrderStageInput,
  now: Date = new Date(),
): OrderStage {
  const status = effectiveOrderStatus(order, now)

  if (status === 'Expired') return 'Expired'
  if (status === 'Cancelled') return 'Cancelled'

  if (status === 'Completed') {
    return order.ticketsSent ? 'Done' : 'TicketsPending'
  }
  if (status === 'Paid') {
    // Betaling is bevestigd maar de ticketmail is (nog) niet gelukt/gestuurd.
    return 'TicketsPending'
  }

  const state = order.payment?.state ?? 'Waiting'

  if (status === 'AwaitingReview') {
    if (state === 'Rejected') return 'ProofRejected'
    return 'ProofSubmitted'
  }

  // PendingPayment: nog niets bevestigd, nog niets ingediend.
  if (order.paymentMethod === 'WhatsApp') {
    return state === 'Requested' ? 'PaymentRequested' : 'NewOrder'
  }
  return 'AwaitingTransfer'
}
