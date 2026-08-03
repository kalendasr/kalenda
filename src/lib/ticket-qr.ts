/**
 * QR-inhoud van een ticket (BUSINESS_RULES BR-700/701, BR-704).
 *
 * De QR-code is geen willekeurige blob maar een resolvende URL naar de ticket.
 * Fase 7 (scanner) leest deze URL en zoekt de ticket erop. Omdat de payload puur
 * uit het ticketnummer wordt afgeleid, is er maar één bron van waarheid: bij
 * opnieuw versturen blijft de QR altijd gelijk (BR-704).
 *
 * Deze functie is gedeeld tussen server (PDF) en client (SVG op de orderpagina),
 * zodat beide altijd dezelfde QR produceren.
 */

/**
 * Geeft de QR-payload voor een ticket.
 *
 * @param ticketNumber  Het unieke ticketnummer (UUID).
 * @param baseUrl       De public base URL van de applicatie (bijv. BETTER_AUTH_URL).
 */
export function ticketQrPayload(ticketNumber: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/ticket/${ticketNumber}`
}
