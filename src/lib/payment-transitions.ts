import type { PaymentMethod, PaymentState } from '#/generated/prisma/client.ts'

/**
 * Betaaltoestand-logica (BR-602/603/604/605). Puur en testbaar.
 *
 * Het platform verwerkt geen geld (BR-600); dit modelleert alleen de workflow.
 * Eén Payment per order. De toestand op Order (`paymentStatus`) is een
 * gedenormaliseerde projectie die in dezelfde transactie wordt bijgewerkt.
 */

/**
 * Legale overgangen per actie. Vanuit elke huidige toestand staat alleen de
 * mismatch tussen "huidig" en "doel" toe als de actie geldig is. We modelleren
 * expliciet welke acties op welke bron-toestand mogen, zodat illegale
 * overgangen onmogelijk zijn (bv. Verified → Submitted).
 */
export type PaymentAction =
  | 'submit' // klant dient (bank)bewijs in (BR-603/605)
  | 'approve' // organisator keurt goed / bevestigt (BR-602/603)
  | 'reject' // organisator keurt af (BR-603/607)
  | 'cancel' // order komt te vervallen/wordt geannuleerd

/** Acties toegestaan per huidige toestand. */
export const ALLOWED_ACTIONS: Record<
  PaymentState,
  ReadonlySet<PaymentAction>
> = {
  Waiting: new Set(['submit', 'approve', 'reject', 'cancel']),
  Submitted: new Set(['approve', 'reject']),
  Verified: new Set(),
  Rejected: new Set(['submit', 'cancel']),
  Cancelled: new Set(),
}

/** Nieuwe toestand per (bron, actie). */
export const NEXT_STATE: Record<
  PaymentState,
  Partial<Record<PaymentAction, PaymentState>>
> = {
  Waiting: {
    submit: 'Submitted',
    approve: 'Verified',
    reject: 'Rejected',
    cancel: 'Cancelled',
  },
  Submitted: { approve: 'Verified', reject: 'Rejected' },
  Verified: {},
  Rejected: { submit: 'Submitted', cancel: 'Cancelled' },
  Cancelled: {},
}

/** Geeft de toestand na een toegestane actie, of null als de actie illegaal is. */
export function nextState(
  current: PaymentState,
  action: PaymentAction,
): PaymentState | null {
  if (!ALLOWED_ACTIONS[current].has(action)) return null
  return NEXT_STATE[current][action] ?? null
}

/** Is deze overgang (huidig → doel) toegestaan? */
export function canTransition(
  current: PaymentState,
  target: PaymentState,
): boolean {
  return (Object.keys(NEXT_STATE[current]) as PaymentAction[]).some(
    (action) => NEXT_STATE[current][action] === target,
  )
}

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  Waiting: 'Wacht op betaling',
  Submitted: 'Bewijs ontvangen',
  Verified: 'Betaald',
  Rejected: 'Afgekeurd',
  Cancelled: 'Geannuleerd',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  WhatsApp: 'WhatsApp',
  BankTransfer: 'Bankoverschrijving',
}

/** Badgevariant per betalingstoestand — één bron voor alle badges. */
export function paymentStateBadgeVariant(
  state: PaymentState,
): 'soft-success' | 'soft-warning' | 'soft-destructive' | 'soft-muted' {
  if (state === 'Verified') return 'soft-success'
  if (state === 'Submitted') return 'soft-warning'
  if (state === 'Rejected' || state === 'Cancelled') return 'soft-destructive'
  return 'soft-muted'
}
