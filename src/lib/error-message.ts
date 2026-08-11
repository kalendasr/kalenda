/**
 * Vertaalt interne foutsleutels (bv. `EVENT_NOT_FOUND`, geworpen door guards
 * als `requireOwnedEvent`) naar leesbare, niet-technische tekst voor
 * toast-meldingen (CLAUDE.md §3 microcopy-regels). De meeste server-fouten
 * zijn al gebruiksvriendelijk Nederlands geschreven — alleen de vaste
 * sentinel-strings hieronder hebben vertaling nodig.
 */
const SENTINEL_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Je bent uitgelogd. Log opnieuw in om door te gaan.',
  FORBIDDEN: 'Je hebt geen toegang tot deze actie.',
  EVENT_NOT_FOUND: 'Dit evenement is niet gevonden.',
  ORDER_NOT_FOUND: 'Deze bestelling is niet gevonden.',
  PAYMENT_NOT_FOUND: 'Er is geen betaling gevonden bij deze bestelling.',
  ORGANIZATION_NOT_FOUND: 'Je organisatie is niet gevonden.',
  TICKET_TYPE_NOT_FOUND: 'Dit tickettype is niet gevonden.',
  CONTENT_NOT_FOUND: 'Dit onderdeel is niet gevonden.',
  CANNOT_BLOCK_SELF: 'Je kunt jezelf niet blokkeren.',
  USER_NOT_FOUND: 'Deze gebruiker is niet gevonden.',
  CATEGORY_NOT_FOUND: 'Deze categorie is niet gevonden.',
  CANNOT_BLOCK_ADMIN:
    'Deze gebruiker is platformbeheerder. Trek eerst de beheerdersrol in.',
  CANNOT_CHANGE_OWN_ROLE:
    'Je kunt je eigen beheerdersrol niet wijzigen. Laat een andere beheerder dit doen.',
  CANNOT_PROMOTE_INACTIVE_USER:
    'Een geblokkeerd of verwijderd account kan geen platformbeheerder worden.',
  LAST_PLATFORM_ADMIN:
    'Dit is de laatste platformbeheerder. Maak eerst iemand anders beheerder.',
  CANNOT_DELETE_SELF: 'Je kunt je eigen account niet verwijderen.',
  CANNOT_DELETE_ADMIN:
    'Een platformbeheerder kan niet verwijderd worden. Trek eerst de beheerdersrol in.',
  CANNOT_DELETE_ORGANIZER:
    'Deze gebruiker is eigenaar van een actieve organisatie. Deactiveer eerst de organisatie.',
}

export function errorMessage(
  error: unknown,
  fallback = 'Er ging iets mis. Probeer het opnieuw.',
): string {
  if (!(error instanceof Error)) return fallback
  return SENTINEL_MESSAGES[error.message] ?? error.message
}
