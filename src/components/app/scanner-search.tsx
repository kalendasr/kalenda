import { useState } from 'react'
import { Search } from 'lucide-react'

import { listEventTickets } from '#/server/scanner.ts'
import {
  TICKET_STATUS_LABELS,
  ticketStatusBadgeVariant,
} from '#/lib/ticket-status.ts'
import { errorMessage } from '#/lib/error-message.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { toast } from '#/components/ui/sonner.tsx'

/**
 * Bezoeker zoeken aan de deur (ROADMAP Fase 7: "Ticket zoeken").
 *
 * Handmatig invoeren (`scanner-manual.tsx`) werkt alleen als de bezoeker zijn
 * ticketnummer kent. Wie zijn mail kwijt is, heeft alleen zijn naam — daar is
 * dit voor. Inchecken gebeurt via dezelfde `resolveScan` als camera en
 * handinvoer: de gevonden rij levert een ticketnummer, niet een eigen
 * check-inpad, zodat de dubbele-scandetectie (BR-801) overal gelijk blijft.
 */
type Row = Awaited<ReturnType<typeof listEventTickets>>[number]

export function ScannerSearch({
  eventId,
  onScan,
}: {
  eventId: string
  onScan: (payload: string) => void
}) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Array<Row> | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      toast.error('Typ minstens twee letters om te zoeken.')
      return
    }
    setBusy(true)
    try {
      setRows(await listEventTickets({ data: { eventId, query: trimmed } }))
    } catch (error) {
      toast.error(errorMessage(error, 'Zoeken is niet gelukt.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Naam, e-mail of bestelnummer"
            className="pl-9"
            aria-label="Zoek een bezoeker op naam, e-mail of bestelnummer"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? 'Zoeken…' : 'Zoeken'}
        </Button>
      </form>

      {rows === null ? null : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen bezoeker gevonden voor “{query.trim()}”. Probeer een deel van de
          naam, of vraag om het bestelnummer uit de bevestigingsmail.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const klant = row.orderItem.order.customer
            const ingecheckt = row.status === 'CheckedIn'
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {klant.firstName} {klant.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.orderItem.ticketType.name} · {row.ticketNumber} ·{' '}
                    {row.orderItem.order.orderNumber}
                  </p>
                </div>
                <Badge variant={ticketStatusBadgeVariant(row.status)}>
                  {TICKET_STATUS_LABELS[row.status]}
                </Badge>
                <Button
                  size="sm"
                  disabled={ingecheckt}
                  onClick={() => onScan(row.ticketNumber)}
                >
                  {ingecheckt ? 'Al ingecheckt' : 'Check in'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
