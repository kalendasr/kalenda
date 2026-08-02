/**
 * Datum/tijd-hulpen. De MVP draait in één tijdzone: Suriname (America/Paramaribo,
 * UTC-3, geen zomertijd). `datetime-local`-invoer wordt als Suriname-tijd
 * geïnterpreteerd en als UTC opgeslagen; teruglezen doet het omgekeerde.
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */

const SURINAME_OFFSET = '-03:00'
const OFFSET_MS = 3 * 60 * 60 * 1000

/** "2026-09-01T20:00" (Suriname-tijd) → Date (UTC). Leeg/ongeldig → null. */
export function surinameLocalToDate(
  local: string | undefined | null,
): Date | null {
  if (!local) return null
  const date = new Date(`${local}:00${SURINAME_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Date → "2026-09-01T20:00" in Suriname-tijd, voor een datetime-local input. */
export function dateToSurinameLocal(date: Date | null | undefined): string {
  if (!date) return ''
  const shifted = new Date(date.getTime() - OFFSET_MS)
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
      shifted.getUTCDate(),
    )}` + `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  )
}

/** Nette Nederlandse weergave, bijv. "1 september 2026 om 20:00". */
export function formatDateTimeNl(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

/** Alleen de datum, bijv. "1 september 2026". */
export function formatDateNl(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    dateStyle: 'long',
  }).format(date)
}
