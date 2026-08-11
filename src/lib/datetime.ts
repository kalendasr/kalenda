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

/** Compacte weergave, bijv. "5 aug 13:31", voor ruimtekrappe lijsten. */
export function formatDateTimeShortNl(date: Date | null | undefined): string {
  if (!date) return ''
  const datePart = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    day: 'numeric',
    month: 'short',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  return `${datePart.replace('.', '')} ${timePart}`
}

/** Alleen de tijd, bijv. "20:00", voor "vandaag om ..."-teksten. */
export function formatTimeNl(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    hour: '2-digit',
    minute: '2-digit',
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

/** Kalenderdatum ("2026-08-05") en weekdag (0 = zondag) van een moment, in Suriname-tijd. */
export function surinameDateParts(date: Date) {
  const shifted = new Date(date.getTime() - OFFSET_MS)
  return {
    dateKey: shifted.toISOString().slice(0, 10),
    weekday: shifted.getUTCDay(),
  }
}

/** Is `date` dezelfde kalenderdag als `now` in Suriname-tijd? */
export function isSurinameToday(date: Date, now: Date = new Date()): boolean {
  return surinameDateParts(date).dateKey === surinameDateParts(now).dateKey
}

/**
 * Het eerstvolgende weekend (vrijdag 00:00 t/m zondag 23:59:59, Suriname-tijd)
 * gerekend vanaf `now`. Valt `now` al in een weekend, dan is dat het lopende
 * weekend.
 */
export function upcomingWeekendRange(now: Date = new Date()) {
  const { weekday } = surinameDateParts(now)
  // Vrijdag(5)..zondag(0) vallen al in het lopende weekend (terugrekenen naar
  // de start ervan); maandag(1)..donderdag(4) rekenen vooruit naar vrijdag.
  const offsetDays =
    weekday === 0 ? -2 : weekday === 6 ? -1 : (5 - weekday + 7) % 7
  const fridayStart = new Date(
    now.getTime() - OFFSET_MS + offsetDays * 86_400_000,
  )
  fridayStart.setUTCHours(0, 0, 0, 0)
  const sundayEnd = new Date(fridayStart.getTime() + 3 * 86_400_000 - 1)
  return { fridayStart, sundayEnd }
}

/** Valt `date` in het eerstvolgende (of lopende) weekend, Suriname-tijd? */
export function isSurinameWeekend(date: Date, now: Date = new Date()): boolean {
  const { fridayStart, sundayEnd } = upcomingWeekendRange(now)
  const shifted = new Date(date.getTime() - OFFSET_MS)
  return shifted >= fridayStart && shifted <= sundayEnd
}

/** 0=zondag..6=zaterdag van `date` in Suriname-tijd, voor dagtabs (vr/za/zo). */
export function surinameWeekday(date: Date): number {
  return surinameDateParts(date).weekday
}

/** "47 uur 52 min" tot `expiresAt`, of "Verlopen" als dat moment al voorbij is. */
export function formatRemaining(
  expiresAt: Date,
  now: Date = new Date(),
): string {
  const totalMinutes = Math.floor(
    (expiresAt.getTime() - now.getTime()) / 60_000,
  )
  if (totalMinutes <= 0) return 'Verlopen'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} uur ${minutes} min`
}

/**
 * Verstreken deel (0-100) van het venster `createdAt`..`expiresAt`, voor de
 * voortgangsbalk op de orderstatuspagina. Geklemd, zodat een al verlopen
 * order 100 geeft in plaats van > 100.
 */
export function elapsedPercentage(
  createdAt: Date,
  expiresAt: Date,
  now: Date = new Date(),
): number {
  const total = expiresAt.getTime() - createdAt.getTime()
  if (total <= 0) return 100
  const elapsed = now.getTime() - createdAt.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}
