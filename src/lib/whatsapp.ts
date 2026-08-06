/**
 * WhatsApp-linkhelper. Het platform verstuurt zelf geen WhatsApp-berichten
 * (geen WhatsApp Business API) — het opent een `wa.me`-gesprek met
 * vooringevulde tekst en laat de organisator op verzenden drukken. Dat past
 * bij §5/§6 CLAUDE.md: het platform beheert het proces, niet de transactie.
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */

/** Geeft een `wa.me`-URL, of `null` als er geen telefoonnummer bekend is. */
export function waLink(
  phone: string | null | undefined,
  text: string,
): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
