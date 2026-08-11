import { useState } from 'react'
import { Search, ScanLine } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'

/**
 * Handmatige check-in (ROADMAP Fase 7). Voor wanneer de camera niet werkt maar
 * de bezoeker zijn ticketcode wél bij de hand heeft — geplakt of overgetypt
 * van zijn mail. Roept dezelfde `resolveScan` aan als de camera: geen
 * duplicaatlogica, dus ook hier werkt de dubbele-scandetectie (BR-801).
 *
 * Let op bij de teksten hier: een ticketcode is een UUID van 36 tekens
 * (`ticket-number.ts`). Die dicteert niemand aan de deur uit zijn hoofd. Wie
 * niets bij de hand heeft, hoort thuis bij "Bezoeker zoeken"
 * (`scanner-search.tsx`) — daarom belooft dit veld niet meer dan het waar kan
 * maken.
 */
export function ScannerManual({
  onScan,
}: {
  onScan: (payload: string) => void
}) {
  const [value, setValue] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onScan(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <ScanLine
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Plak of scan de ticketcode"
          className="pl-9"
          aria-label="Ticketcode invoeren voor handmatige check-in"
          autoComplete="off"
          autoFocus
        />
      </div>
      <Button type="submit">
        <Search />
        Check in
      </Button>
    </form>
  )
}
