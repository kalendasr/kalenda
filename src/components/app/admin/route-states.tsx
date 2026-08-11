import { AlertTriangle } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { errorMessage } from '#/lib/error-message.ts'

/**
 * Laad- en foutschermen voor de beheerdersroutes.
 *
 * Elke adminroute hangt aan een `loader`; zonder deze twee ziet een beheerder
 * bij een trage of mislukte query een leeg scherm zonder uitleg. De foutstaat
 * vertelt wat er misging en biedt één herstelactie — nooit alleen een
 * stacktrace.
 */

export function AdminErrorState({
  error,
  reset,
}: {
  error: Error
  reset?: () => void
}) {
  return (
    <Card className="items-center gap-4 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">Dit scherm kon niet laden</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {errorMessage(error, 'De gegevens konden niet opgehaald worden.')}
        </p>
      </div>
      {reset ? (
        <Button variant="outline" onClick={reset}>
          Opnieuw proberen
        </Button>
      ) : null}
    </Card>
  )
}

export function AdminPendingState({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Gegevens worden geladen…</span>
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <Card className="gap-0 divide-y px-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 py-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </Card>
    </div>
  )
}
