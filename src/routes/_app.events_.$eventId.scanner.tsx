import { useState } from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { CameraOff, History, Link2, ScanLine, UserPlus } from 'lucide-react'

import { listEventCheckIns, resolveScan } from '#/server/scanner.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { SCAN_RESULT_LABELS, scanResultBadgeClass } from '#/lib/scan-result.ts'
import type { CheckInResult } from '#/lib/scan-result.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
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
  const { user } = workspaceRoute.useRouteContext()
  const { history } = Route.useLoaderData()
  const router = useRouter()

  const [scannerOpen, setScannerOpen] = useState(false)
  const [feedback, setFeedback] = useState<{
    result: CheckInResult
    ticket: ScanTicketView | null
  } | null>(null)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [showCamera, setShowCamera] = useState(true)
  const [busy, setBusy] = useState(false)

  async function shareScanLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Scannerlink gekopieerd naar het klembord.')
    } catch {
      toast.error('Kopiëren is niet gelukt.')
    }
  }

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

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Deurbeheer-hero */}
        <section className="rounded-2xl bg-foreground p-6 text-background">
          <div className="font-eyebrow text-[10px] font-medium tracking-[0.11em] text-background/60 uppercase">
            Deurbeheer
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Scan tickets bij de ingang
          </h2>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-background/70">
            Open de scanner op je telefoon of geef je deurteam een scanlink.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              className="bg-background text-foreground hover:bg-background/90"
              onClick={() => setScannerOpen((open) => !open)}
            >
              <ScanLine /> {scannerOpen ? 'Scanner sluiten' : 'Scanner openen'}
            </Button>
            <Button
              variant="outline"
              className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              onClick={shareScanLink}
            >
              <Link2 /> Scanlink delen
            </Button>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Ingecheckt" value={stats.Valid} tone="success" />
            <StatTile
              label="Dubbele scans"
              value={stats.AlreadyCheckedIn}
              tone="warning"
            />
            <StatTile
              label="Ongeldig"
              value={stats.Invalid}
              tone="destructive"
            />
            <StatTile
              label="Niet gevonden"
              value={stats.NotFound}
              tone="destructive"
            />
          </div>

          <DoorTeamCard ownerName={user.name} />
        </div>
      </div>

      {!scannerOpen ? null : showCamera && cameraAvailable ? (
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

function DoorTeamCard({ ownerName }: { ownerName: string }) {
  const initials =
    ownerName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between gap-3 px-5 pt-5 pb-3">
        <CardTitle className="text-base">Deurteam</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info('Teamleden uitnodigen volgt in een vervolgronde.')
          }
        >
          <UserPlus /> Uitnodigen
        </Button>
      </CardHeader>
      <CardContent className="border-t px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{ownerName}</span>
            <span className="block text-xs text-muted-foreground">
              Eigenaar · mag scannen
            </span>
          </span>
          <span className="text-xs font-semibold text-success">Actief</span>
        </div>
      </CardContent>
    </Card>
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
      <span className="font-eyebrow text-xs text-muted-foreground">
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
