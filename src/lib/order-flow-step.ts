import { effectiveOrderStatus } from '#/lib/order-status.ts'
import type { OrderStatus } from '#/lib/order-status.ts'

/**
 * Vertaalt orderstatus (BR-505) naar het te tonen scherm en de actieve stap in
 * de tijdlijn "Wat gebeurt er nu?" op de orderstatuspagina. Puur en testbaar,
 * zodat de status-afgeleide UI niet als geneste ternaries in de JSX leeft.
 */

export type OrderFlowScreen = 'wacht' | 'betaald' | 'verlopen'

/** Aantal stappen in de tijdlijn (aanvraag ontvangen → betaalverzoek → controle → ticket). */
export const TIMELINE_STEP_COUNT = 4

export function deriveOrderFlowStep(
  order: { orderStatus: OrderStatus; expiresAt: Date },
  now: Date = new Date(),
): { screen: OrderFlowScreen; activeStep: number; status: OrderStatus } {
  const status = effectiveOrderStatus(order, now)

  if (status === 'Expired' || status === 'Cancelled') {
    return { screen: 'verlopen', activeStep: 0, status }
  }
  if (status === 'Paid' || status === 'Completed') {
    return { screen: 'betaald', activeStep: 3, status }
  }
  if (status === 'AwaitingReview') {
    return { screen: 'wacht', activeStep: 2, status }
  }
  // PendingPayment
  return { screen: 'wacht', activeStep: 1, status }
}
