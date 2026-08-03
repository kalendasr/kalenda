/**
 * Scan-resultaatlogica (BUSINESS_RULES BR-800..BR-804). Puur en testbaar.
 *
 * De scanner leest een QR (of een handmatig ingevoerd nummer) en moet weten
 * welk resultaat daarbij hoort. Deze module is de Enige Bron van Waarheid voor
 * de mapping van ticketstaat → scanresultaat, én voor de Nederlandse labels en
 * badgekleuren die overal in de scanner-UI worden hergebruikt.
 *
 * Belangrijk: de autoritatieve concurrentiebeslissing (wie wint bij twee
 * gelijktijdige scans) ligt in de databaselaag — `resolveScan` in
 * `src/server/scanner.ts` gebruikt een conditionele `updateMany` binnen een
 * transactie. Deze functie is uitsluitend een read-only mapping: zij kijkt naar
 * de huidige ticketstaat en zegt welk resultát dat zou opleveren. De UI gebruikt
 * dit om de terugkoppeling te kleuren; tests gebruiken het om de logica vast te
 * leggen zonder een database nodig te hebben.
 */

import type { TicketStatus } from '#/generated/prisma/enums.ts'

export type CheckInResult =
  'Valid' | 'AlreadyCheckedIn' | 'Invalid' | 'NotFound'

/** Ticketstatussen die nog mogen worden ingecheckt (BR-702). */
const CHECKINABLE_STATUSES: ReadonlySet<TicketStatus> = new Set([
  'Issued',
  'Sent',
])

/**
 * Bepaalt het scanresultaat op basis van de gelezen ticketstaat.
 *
 * - Ticket bestaat niet (of hoort niet bij dit event) → `NotFound` (BR-804)
 * - Geannuleerd ticket → `Invalid` (BR-803)
 * - Al ingecheckt → `AlreadyCheckedIn` (BR-802, niet opnieuw inchecken)
 * - Nog niet ingecheckt (Issued/Sent) → `Valid` (BR-801)
 */
export function resolveScanResult(input: {
  exists: boolean
  status?: TicketStatus
}): CheckInResult {
  if (!input.exists) return 'NotFound'
  if (input.status === 'Cancelled') return 'Invalid'
  if (input.status === 'CheckedIn') return 'AlreadyCheckedIn'
  if (input.status && CHECKINABLE_STATUSES.has(input.status)) return 'Valid'
  // Onverwachte status: behandel veilig als niet gevonden.
  return 'NotFound'
}

export const SCAN_RESULT_LABELS: Record<CheckInResult, string> = {
  Valid: 'Welkom',
  AlreadyCheckedIn: 'Al ingecheckt',
  Invalid: 'Ticket ongeldig',
  NotFound: 'Ticket niet gevonden',
}

/** Korte omschrijving voor onder de titel in de scanterugkoppeling. */
export const SCAN_RESULT_DESCRIPTIONS: Record<CheckInResult, string> = {
  Valid: 'De bezoeker is ingecheckt.',
  AlreadyCheckedIn: 'Dit ticket is al een keer gescand.',
  Invalid: 'Dit ticket is geannuleerd en mag niet naar binnen.',
  NotFound: 'Dit ticketnummer bestaat niet voor dit evenement.',
}

/** Tailwind-klassen per resultaat voor de fullscreen terugkoppeling. */
export const SCAN_RESULT_SCREEN_CLASSES: Record<CheckInResult, string> = {
  Valid: 'bg-success text-success-foreground',
  AlreadyCheckedIn: 'bg-warning text-warning-foreground',
  Invalid: 'bg-destructive text-white',
  NotFound: 'bg-destructive text-white',
}

/**
 * Badgekleur per resultaat — één bron van waarheid voor de scangeschiedenis.
 * Gebruikt de bestaande shadcn Badge-varianten plus aangepaste succes/waarschuwing.
 */
export function scanResultBadgeClass(result: CheckInResult): string {
  if (result === 'Valid')
    return 'border-transparent bg-success text-success-foreground'
  if (result === 'AlreadyCheckedIn')
    return 'border-transparent bg-warning text-warning-foreground'
  return 'border-transparent bg-destructive text-white'
}

/** Is dit een resultaat dat de bezoeker toegang geeft? */
export function isAdmitResult(result: CheckInResult): boolean {
  return result === 'Valid'
}
