/**
 * Geldhulpen. Bedragen worden overal als gehele centen (integers) behandeld om
 * afrondingsfouten te voorkomen. De MVP rekent uitsluitend in SRD.
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */

const nf = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 5000 → "SRD 50,00". */
export function formatSrd(cents: number): string {
  return `SRD ${nf.format(cents / 100)}`
}

/**
 * Zet een prijs uit een formulier om naar centen. Accepteert "50", "50,00",
 * "50.00" en "50,5". Geeft `null` terug bij een ongeldige of negatieve waarde.
 */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null

  // Alleen cijfers met maximaal één decimaalteken.
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  const value = Number(normalized)
  if (Number.isNaN(value) || value < 0) return null

  return Math.round(value * 100)
}

/** Centen → formulierwaarde "50,00" voor een prijsinvoerveld. */
export function centsToInput(cents: number): string {
  return nf.format(cents / 100)
}

/**
 * Vaste weergavekoers voor de publieke storefront (SRD/EUR-toggle). Puur
 * cosmetisch: er wordt nergens in EUR afgerekend of opgeslagen — checkout,
 * orders en betalingen blijven altijd in SRD-centen (BR-600). Wijzig deze
 * waarde handmatig als de indicatieve koers verouderd raakt.
 */
export const SRD_PER_EUR = 40

/** 5000 → "€ 1,25". Uitsluitend voor weergave, nooit voor bedragen die worden opgeslagen. */
export function formatEur(cents: number): string {
  return `€ ${nf.format(cents / (100 * SRD_PER_EUR))}`
}

/** Formatteert centen (altijd in SRD opgeslagen) in de gekozen weergavevaluta. */
export function formatMoney(
  cents: number,
  currency: 'SRD' | 'EUR' = 'SRD',
): string {
  return currency === 'EUR' ? formatEur(cents) : formatSrd(cents)
}
