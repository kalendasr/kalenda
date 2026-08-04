import { Link } from '@tanstack/react-router'

import { cn } from '#/lib/utils.ts'
import { Card } from '#/components/ui/card.tsx'

type StatCardTone = 'default' | 'success' | 'warning' | 'danger'

const TONE_CLASSES: Record<StatCardTone, string> = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
}

export function StatCard({
  label,
  value,
  subtext,
  tone = 'default',
  href,
}: {
  label: string
  value: string | number
  subtext?: string
  tone?: StatCardTone
  href?: string
}) {
  const content = (
    <>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {subtext ? (
        <div className={cn('mt-0.5 text-sm', TONE_CLASSES[tone])}>
          {subtext}
        </div>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="flex flex-col rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent"
      >
        {content}
      </Link>
    )
  }

  return <Card className="p-4 shadow-none">{content}</Card>
}
