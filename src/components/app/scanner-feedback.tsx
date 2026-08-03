import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'

import {
  SCAN_RESULT_DESCRIPTIONS,
  SCAN_RESULT_LABELS,
  SCAN_RESULT_SCREEN_CLASSES,
} from '#/lib/scan-result.ts'
import type { CheckInResult } from '#/lib/scan-result.ts'

type ScanTicketView = {
  holderName: string
  ticketTypeName: string
  ticketNumber: string
}

/**
 * Fullscreen terugkoppeling na een scan (USER_FLOWS #13). Kleur wordt altijd
 * gecombineerd met een icoon én tekst — nooit alleen kleur (toegankelijkheid).
 * De `aria-live`-regio kondigt het resultaat aan voor schermlezers.
 */
export function ScannerFeedback({
  result,
  ticket,
}: {
  result: CheckInResult
  ticket: ScanTicketView | null
}) {
  const Icon = ICONS[result]

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center transition-colors ${SCAN_RESULT_SCREEN_CLASSES[result]}`}
    >
      <Icon className="size-20" aria-hidden />
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight">
          {SCAN_RESULT_LABELS[result]}
        </p>
        <p className="max-w-sm text-base opacity-90">
          {SCAN_RESULT_DESCRIPTIONS[result]}
        </p>
      </div>

      {ticket ? (
        <div className="rounded-lg bg-black/10 px-4 py-3 text-left">
          <p className="font-medium">{ticket.holderName}</p>
          <p className="text-sm opacity-90">{ticket.ticketTypeName}</p>
          <p className="mt-1 font-mono text-xs opacity-75">
            {ticket.ticketNumber}
          </p>
        </div>
      ) : null}
    </div>
  )
}

const ICONS: Record<CheckInResult, typeof CheckCircle2> = {
  Valid: CheckCircle2,
  AlreadyCheckedIn: AlertTriangle,
  Invalid: XCircle,
  NotFound: HelpCircle,
}
