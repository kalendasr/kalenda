import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Koptekst van een adminpagina: titel, uitleg, optioneel kruimelpad en één
 * actiezone rechts. Eén component zodat elke adminpagina er hetzelfde uitziet
 * en de titelhiërarchie (precies één `h1`) overal klopt.
 */
export type Crumb = {
  label: string
  to?: string
  params?: Record<string, string>
}

export function AdminPageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string
  description?: string
  crumbs?: Array<Crumb>
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Kruimelpad" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {crumbs.map((crumb, index) => (
                <li
                  key={`${crumb.label}-${index}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 ? (
                    <ChevronRight className="size-3.5 opacity-60" aria-hidden />
                  ) : null}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      params={crumb.params}
                      className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <h1 className="text-[29px] font-extrabold tracking-[-0.03em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
