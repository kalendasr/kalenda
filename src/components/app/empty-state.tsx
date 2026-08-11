import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '#/components/ui/card.tsx'
import { cn } from '#/lib/utils.ts'

/**
 * Lege staat: icoon, kop, uitleg en hooguit één actie.
 *
 * De uitleg is verplicht (CLAUDE.md §3): een lege lijst moet vertellen
 * *waarom* hij leeg is — er is nog niets, of het filter sluit alles uit — en
 * niet alleen "geen resultaten".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn('items-center gap-4 px-6 py-14 text-center', className)}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </Card>
  )
}
