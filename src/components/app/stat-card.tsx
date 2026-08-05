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
      <div className="font-eyebrow text-[10.5px] font-medium tracking-[0.09em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-3 text-[26px] font-extrabold tracking-[-0.025em] tabular-nums">
        {value}
      </div>
      {subtext ? (
        <div
          className={cn('mt-1.5 text-[13px] font-semibold', TONE_CLASSES[tone])}
        >
          {subtext}
        </div>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="flex flex-col rounded-2xl border bg-card px-5 py-[18px] text-card-foreground transition-colors hover:bg-accent"
      >
        {content}
      </Link>
    )
  }

  return (
    <Card className="gap-0 rounded-2xl px-5 py-[18px] shadow-none">
      {content}
    </Card>
  )
}
