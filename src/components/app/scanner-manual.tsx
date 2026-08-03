import { useState } from 'react'
import { Search, ScanLine } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'

/**
 * Handmatige check-in (ROADMAP Fase 7: "Handmatige check-in"). Voor wanneer de
 * camera niet werkt of de bezoeker geen QR kan tonen. Roept dezelfde
 * `resolveScan` aan als de camera — geen duplicaatlogica.
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
          placeholder="Ticketnummer of QR-invoer"
          className="pl-9"
          aria-label="Ticketnummer invoeren voor handmatige check-in"
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
