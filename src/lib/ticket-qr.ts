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

/**
 * Haalt het ticketnummer uit een gescande QR-payload (BR-700/701, Fase 7).
 *
 * De QR bevat een resolvende URL `…/ticket/<ticketnummer>`, maar een scanner
 * mag ook een kaal ticketnummer teruggeven. Beide worden geaccepteerd; witruimte
 * wordt genegeerd. Geeft `null` als er geen bruikbaar nummer in zit, zodat de
 * aanroeper dat als een NotFound-scan (BR-804) kan behandelen.
 */
export function parseTicketNumberFromQr(payload: string): string | null {
  if (!payload) return null
  const trimmed = payload.trim()
  if (!trimmed) return null

  // Probeert eerst het laatste padsegment van een `/ticket/…`-URL.
  const match = trimmed.match(/\/ticket\/([^/?#]+)/)
  if (match?.[1]) return decodeURIComponent(match[1])

  // Een kaal UUID / nummer: accepteer als het geen URL met scheme is.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed

  return null
}
