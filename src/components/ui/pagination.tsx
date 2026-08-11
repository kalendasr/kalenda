import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { PAGE_SIZES } from '#/lib/pagination.ts'
import type { PageMeta, PageSize } from '#/lib/pagination.ts'
import { cn } from '#/lib/utils.ts'

/**
 * Paginatiebalk voor de beheerderslijsten.
 *
 * Toont altijd het bereik ("1–25 van 1.284") in plaats van alleen
 * paginanummers: een beheerder wil weten hoe groot de dataset is die hij
 * filtert, niet alleen waar hij zit. De paginagrootte is een gesloten keuze
 * die overeenkomt met `PAGE_SIZES` op de server.
 */
export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  meta: PageMeta
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: PageSize) => void
  className?: string
}) {
  const formatter = new Intl.NumberFormat('nl-NL')

  return (
    <nav
      aria-label="Paginering"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t px-5 pt-4',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {meta.total === 0
          ? 'Geen resultaten'
          : `${formatter.format(meta.from)}–${formatter.format(meta.to)} van ${formatter.format(meta.total)}`}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Per pagina</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              value={meta.pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value) as PageSize)
              }
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasPrevious}
            onClick={() => onPageChange(meta.page - 1)}
            aria-label="Vorige pagina"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Vorige</span>
          </Button>
          <span className="px-2 text-sm text-muted-foreground tabular-nums">
            {meta.page} / {meta.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasNext}
            onClick={() => onPageChange(meta.page + 1)}
            aria-label="Volgende pagina"
          >
            <span className="hidden sm:inline">Volgende</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
