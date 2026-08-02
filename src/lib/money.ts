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
