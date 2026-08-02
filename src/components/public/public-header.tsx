import { Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'

/**
 * Header voor de publieke storefront (niet-ingelogde bezoekers).
 */
export function PublicHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-(--container-content) items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5 text-primary" aria-hidden="true" />
          Kalenda
        </Link>
        <nav className="flex items-center gap-1" aria-label="Publiek menu">
          <Button asChild variant="ghost" size="sm">
            <Link to="/evenementen">Evenementen</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Voor organisatoren</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
