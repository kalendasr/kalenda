import { Link } from '@tanstack/react-router'
import { AlertTriangle, CalendarDays, Compass } from 'lucide-react'

import { errorMessage } from '#/lib/error-message.ts'
import { Button } from '#/components/ui/button.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'

/**
 * Paginavullende 404- en foutschermen voor de rootroute.
 *
 * Bewust zonder PublicHeader of AppShell: deze schermen draaien ook wanneer
 * het laden van de sessiecontext zelf mislukt, en mogen dus van niets meer
 * uitgaan dan de router. Vandaar het eigen woordmerk in plaats van de
 * gedeelde header.
 */

function FullPageShell({
  icon,
  tone,
  title,
  children,
  action,
}: {
  icon: React.ReactNode
  tone: 'destructive' | 'primary'
  title: string
  children: React.ReactNode
  action: React.ReactNode
}) {
  return (
    <div className="storefront flex min-h-dvh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-(--container-content) items-center px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
            Kalenda<span className="text-primary">.</span>
          </Link>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:px-6"
      >
        <span
          className={
            tone === 'destructive'
              ? 'flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive'
              : 'flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary'
          }
        >
          {icon}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{children}</p>
        </div>
        {action}
      </main>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <FullPageShell
      icon={<Compass className="size-7" aria-hidden="true" />}
      tone="primary"
      title="Deze pagina bestaat niet"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/evenementen">Bekijk evenementen</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Naar de homepagina</Link>
          </Button>
        </div>
      }
    >
      Misschien is de link verouderd of is het evenement niet meer beschikbaar.
      Zoek verder tussen de evenementen die wél online staan.
    </FullPageShell>
  )
}

/**
 * Laadstaat voor de publieke pagina's. Houdt de plek van kop en kaarten vast
 * zodat de pagina niet verspringt zodra de gegevens binnen zijn.
 */
export function StorefrontPendingState({ cards = 3 }: { cards?: number }) {
  return (
    <div
      className="storefront mx-auto w-full max-w-(--container-content) px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Even geduld, we laden deze pagina…</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-full max-w-sm" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * "Niet gevonden" voor een publieke detailpagina (evenement, ticket,
 * bestelling). Houdt de storefront-navigatie in beeld — de bezoeker is hier
 * meestal via een oude link beland en moet verder kunnen zoeken.
 */
export function StorefrontNotFound({
  title,
  description,
  linkLabel,
}: {
  title: string
  description: string
  linkLabel: string
}) {
  return (
    <div className="storefront">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6"
      >
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <Link
          to="/evenementen"
          className="mt-6 inline-block font-medium text-primary hover:underline"
        >
          {linkLabel}
        </Link>
      </main>
      <PublicFooter />
    </div>
  )
}

export function AppErrorPage({
  error,
  reset,
}: {
  error: Error
  reset?: () => void
}) {
  return (
    <FullPageShell
      icon={<AlertTriangle className="size-7" aria-hidden="true" />}
      tone="destructive"
      title="Er ging iets mis"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {reset ? <Button onClick={reset}>Opnieuw proberen</Button> : null}
          <Button asChild variant="outline">
            <Link to="/">Naar de homepagina</Link>
          </Button>
        </div>
      }
    >
      {errorMessage(
        error,
        'We konden deze pagina niet laden. Probeer het zo opnieuw.',
      )}
    </FullPageShell>
  )
}
