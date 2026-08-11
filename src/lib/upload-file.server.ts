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
 * Magic bytes per toegestaan formaat. `file.type` is alleen wat de client
 * beweert — zonder deze controle op de eerste bytes kan willekeurige data als
 * "image/png" de opslag in.
 */
function matchesSignature(type: AllowedType, head: Uint8Array): boolean {
  switch (type) {
    case 'image/png':
      return (
        head.length >= 8 &&
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a
      )
    case 'image/jpeg':
      return (
        head.length >= 3 &&
        head[0] === 0xff &&
        head[1] === 0xd8 &&
        head[2] === 0xff
      )
    case 'image/webp':
      return (
        head.length >= 12 &&
        head[0] === 0x52 && // 'R'
        head[1] === 0x49 && // 'I'
        head[2] === 0x46 && // 'F'
        head[3] === 0x46 && // 'F'
        head[8] === 0x57 && // 'W'
        head[9] === 0x45 && // 'E'
        head[10] === 0x42 && // 'B'
        head[11] === 0x50 // 'P'
      )
  }
}

/**
 * Valideert een geüpload bestand en geeft het bestand + extensie terug.
 * Gegooid met een leesbare, niet-technische foutmelding (microcopy-regels).
 */
export async function validateImageFile(file: unknown): Promise<{
  file: File
  extension: string
}> {
  if (!(file instanceof File)) {
    throw new Error('Er is geen geldig bestand ontvangen.')
  }
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    throw new Error('Gebruik een PNG-, JPG- of WebP-afbeelding.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('De afbeelding mag maximaal 5 MB groot zijn.')
  }
  const type = file.type as AllowedType
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!matchesSignature(type, head)) {
    throw new Error(
      'Dit bestand is geen geldige PNG-, JPG- of WebP-afbeelding.',
    )
  }
  return { file, extension: ALLOWED_IMAGE_TYPES[type] }
}
