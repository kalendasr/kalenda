import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { useCurrency } from '#/lib/currency.ts'
import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'

const NAV_LINKS = [
  { label: 'Evenementen', to: '/evenementen' as const, search: undefined },
  {
    label: 'Dit weekend',
    to: '/evenementen' as const,
    search: { date: 'weekend' as const },
  },
  { label: 'Mijn tickets', to: '/mijn-tickets' as const, search: undefined },
]

/**
 * Header voor de publieke storefront (niet-ingelogde bezoekers). Gedeeld
 * door homepage en zoekpagina zodat navigatie en de valutakeuze overal
 * hetzelfde gedrag hebben.
 */
export function PublicHeader() {
  const { currency, setCurrency } = useCurrency()
  const location = useRouterState({ select: (s) => s.location })

  function isActive(link: (typeof NAV_LINKS)[number]) {
    if (location.pathname !== link.to) return false
    return link.to === '/evenementen'
      ? (location.search as { date?: string }).date === link.search?.date
      : true
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-(--container-content) items-center gap-6 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <CalendarDays className="size-5 text-primary" aria-hidden="true" />
          Kalenda<span className="text-primary">.</span>
        </Link>
        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="Publiek menu"
        >
          {NAV_LINKS.map((link) => (
            <Button
              key={link.label}
              asChild
              variant="ghost"
              size="sm"
              className={cn(isActive(link) && 'bg-accent')}
            >
              <Link to={link.to} search={link.search}>
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div
            className="flex gap-0.5 rounded-md bg-muted p-0.5"
            role="group"
            aria-label="Weergavevaluta"
          >
            <button
              type="button"
              onClick={() => setCurrency('SRD')}
              aria-pressed={currency === 'SRD'}
              className={cn(
                'min-h-8 rounded-sm px-2.5 text-xs font-semibold transition-colors',
                currency === 'SRD'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              SRD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('EUR')}
              aria-pressed={currency === 'EUR'}
              className={cn(
                'min-h-8 rounded-sm px-2.5 text-xs font-semibold transition-colors',
                currency === 'EUR'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              EUR
            </button>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/login">Inloggen</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/register">Event plaatsen</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
