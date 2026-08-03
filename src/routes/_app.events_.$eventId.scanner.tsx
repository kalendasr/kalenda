import { useState } from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { CameraOff, History, ScanLine } from 'lucide-react'

import { listEventCheckIns, resolveScan } from '#/server/scanner.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { SCAN_RESULT_LABELS, scanResultBadgeClass } from '#/lib/scan-result.ts'
import type { CheckInResult } from '#/lib/scan-result.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { toast } from '#/components/ui/sonner.tsx'
import { ScannerCamera } from '#/components/app/scanner-camera.tsx'
import { ScannerFeedback } from '#/components/app/scanner-feedback.tsx'
import { ScannerManual } from '#/components/app/scanner-manual.tsx'

export const Route = createFileRoute('/_app/events_/$eventId/scanner')({
  loader: async ({ params }) => ({
    history: await listEventCheckIns({ data: { eventId: params.eventId } }),
  }),
  component: EventScanner,
})

type HistoryRow = Awaited<ReturnType<typeof listEventCheckIns>>[number]

type ScanTicketView = {
  holderName: string
  ticketTypeName: string
  ticketNumber: string
}

const workspaceRoute = getRouteApi('/_app/events_/$eventId')

function EventScanner() {
  const { event } = workspaceRoute.useLoaderData()
  const { history } = Route.useLoaderData()
  const router = useRouter()

  const [feedback, setFeedback] = useState<{
    result: CheckInResult
    ticket: ScanTicketView | null
  } | null>(null)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [showCamera, setShowCamera] = useState(true)
  const [busy, setBusy] = useState(false)

  async function handleScan(payload: string) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const result = await resolveScan({
        data: { eventId: event.id, payload },
      })
      setFeedback(result)
      await router.invalidate()
      // Na ~2,5s weer klaar voor de volgende scan (auto-rearm).
      window.setTimeout(() => setFeedback(null), 2500)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Scan is niet gelukt.',
      )
    } finally {
      setBusy(false)
    }
  }

  const stats = countByResult(history)

  return (
    <div className="flex flex-col gap-6">
      {feedback ? (
        <ScannerFeedback result={feedback.result} ticket={feedback.ticket} />
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Scanner</h2>
        <p className="text-sm text-muted-foreground">
          Scan de QR-code bij de ingang om bezoekers in te checken.
        </p>
      </div>

      {/* Snelle stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Ingecheckt" value={stats.Valid} tone="success" />
        <StatTile
          label="Dubbele scans"
          value={stats.AlreadyCheckedIn}
          tone="warning"
        />
        <StatTile label="Ongeldig" value={stats.Invalid} tone="destructive" />
        <StatTile
          label="Niet gevonden"
          value={stats.NotFound}
          tone="destructive"
        />
      </div>

      {/* Camera of handmatige invoer */}
      {showCamera && cameraAvailable ? (
        <div className="flex flex-col gap-3">
          <ScannerCamera
            onScan={handleScan}
            paused={busy || feedback !== null}
            onUnavailable={() => setCameraAvailable(false)}
          />
          <Button
            variant="outline"
            onClick={() => setShowCamera(false)}
            className="w-fit"
          >
            <CameraOff />
            Handmatig invoeren
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ScannerManual onScan={handleScan} />
          {cameraAvailable ? (
            <Button
              variant="outline"
              onClick={() => setShowCamera(true)}
              className="w-fit"
            >
              <ScanLine />
              Camera gebruiken
            </Button>
          ) : null}
        </div>
      )}

      {/* Scangeschiedenis */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-medium">Scangeschiedenis</h3>
        </div>

        {history.length === 0 ? (
          <Card className="items-center gap-4 px-6 py-12 text-center">
            <div className="max-w-sm">
              <h4 className="font-medium">Nog geen gescande tickets</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Zodra je een QR-code scant, verschijnt hier wat er is gebeurd.
              </p>
            </div>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((row) => (
              <HistoryCard key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'warning' | 'destructive'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-destructive'
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function HistoryCard({ row }: { row: HistoryRow }) {
  const holder = row.ticket
    ? `${row.ticket.orderItem.order.customer.firstName} ${row.ticket.orderItem.order.customer.lastName}`.trim()
    : null
  const ticketType = row.ticket?.orderItem.ticketType.name ?? null

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-3 shadow-sm">
      <Badge className={scanResultBadgeClass(row.result)}>
        {SCAN_RESULT_LABELS[row.result]}
      </Badge>
      <span className="min-w-0 flex-1">
        {holder ? (
          <>
            <span className="font-medium">{holder}</span>
            {ticketType ? (
              <span className="text-muted-foreground"> · {ticketType}</span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">Onbekend nummer</span>
        )}
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        {row.ticketNumber}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatDateTimeNl(row.scannedAt)}
      </span>
    </li>
  )
}

function countByResult(rows: HistoryRow[]): Record<CheckInResult, number> {
  const base: Record<CheckInResult, number> = {
    Valid: 0,
    AlreadyCheckedIn: 0,
    Invalid: 0,
    NotFound: 0,
  }
  for (const row of rows) base[row.result] += 1
  return base
}
