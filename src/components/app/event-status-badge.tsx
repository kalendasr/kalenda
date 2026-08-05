import { Badge } from '#/components/ui/badge.tsx'

/**
 * Statusbadge voor een evenement (DESIGN_SYSTEM.md §18).
 *
 * De opgeslagen status is Draft/Published/Archived; voor gepubliceerde events
 * leiden we de fase (Aankomend/Live/Afgelopen) af uit de datums, zodat we geen
 * afgeleide status in de database hoeven bij te houden.
 */

type EventStatus = 'Draft' | 'Published' | 'Archived'

export function EventStatusBadge({
  status,
  startsAt,
  endsAt,
  now = new Date(),
}: {
  status: EventStatus
  startsAt: Date | null
  endsAt: Date | null
  now?: Date
}) {
  if (status === 'Draft') {
    return <Badge variant="soft-muted">Concept</Badge>
  }
  if (status === 'Archived') {
    return <Badge variant="soft-muted">Gearchiveerd</Badge>
  }

  // Published: fase afleiden uit de datums.
  if (endsAt && now > endsAt) {
    return <Badge variant="soft-muted">Afgelopen</Badge>
  }
  if (startsAt && now >= startsAt) {
    return <Badge variant="soft-success">Live</Badge>
  }
  return <Badge variant="soft-info">Gepubliceerd</Badge>
}
