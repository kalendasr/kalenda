/**
 * Gedeelde bestandsupload-validatie (server-only).
 *
 * Wordt gebruikt door zowel afbeeldingen (organisatie-branding, event-covers in
 * `server/upload.ts`) als betaalbewijzen (`server/payments.ts`). De bytes lopen
 * altijd via een server function naar R2, zodat de bucket privé blijft.
 */

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

type AllowedType = keyof typeof ALLOWED_IMAGE_TYPES

/**
 * Valideert een geüpload bestand en geeft het bestand + extensie terug.
 * Gegooid met een leesbare, niet-technische foutmelding (microcopy-regels).
 */
export function validateImageFile(file: unknown): {
  file: File
  extension: string
} {
  if (!(file instanceof File)) {
    throw new Error('Er is geen geldig bestand ontvangen.')
  }
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    throw new Error('Gebruik een PNG-, JPG- of WebP-afbeelding.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('De afbeelding mag maximaal 5 MB groot zijn.')
  }
  return { file, extension: ALLOWED_IMAGE_TYPES[file.type as AllowedType] }
}
