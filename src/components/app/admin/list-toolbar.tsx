import * as React from 'react'
import { Search, X } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { cn } from '#/lib/utils.ts'

/**
 * Zoek- en filterbalk boven een beheerderslijst.
 *
 * Het zoekveld is ontkoppeld van de navigatie met een korte vertraging: elke
 * toetsaanslag zou anders een serverquery en een URL-wijziging opleveren. De
 * filters zijn segmentpillen — dezelfde vorm die de organisator al kent van
 * het bestellingenoverzicht — zodat de adminomgeving niet als een andere
 * applicatie voelt.
 */

export function ListToolbar({
  search,
  onSearchChange,
  placeholder = 'Zoeken…',
  children,
}: {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={placeholder}
      />
      {children}
    </div>
  )
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const [draft, setDraft] = React.useState(value)

  // Houd het veld in de pas wanneer de URL van buitenaf verandert (backknop,
  // gedeelde link, filter gewist).
  React.useEffect(() => setDraft(value), [value])

  React.useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <div className="relative min-w-56 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
      {draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label="Zoekopdracht wissen"
          onClick={() => {
            setDraft('')
            onChange('')
          }}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Segmentfilter: een gesloten set opties waarvan er precies één actief is.
 * `aria-pressed` in plaats van tabs, omdat dit de lijst eronder filtert en
 * geen paneel wisselt.
 */
export function FilterPills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-xl bg-muted p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Compacte dropdown voor filters met te veel opties voor pillen. */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
