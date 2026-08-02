/**
 * Ordernummers (BR-500). Leesbaar en zonder verwarrende tekens (geen 0/O, 1/I),
 * met prefix "KAL-". De aanroeper garandeert uniciteit door bij een botsing
 * opnieuw te genereren.
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LENGTH = 8

export function generateOrderNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  let code = ''
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length]
  }
  return `KAL-${code}`
}

/** Controleert of een string een geldig ordernummer-formaat heeft. */
export function isValidOrderNumber(value: string): boolean {
  return new RegExp(`^KAL-[${ALPHABET}]{${LENGTH}}$`).test(value)
}
