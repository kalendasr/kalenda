import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { getPublicUrl, uploadObject } from '#/lib/storage.server.ts'

/**
 * Uploaden van afbeeldingen (organisatie-branding en event-covers) naar R2.
 *
 * De bytes lopen via de server function naar R2. Dat houdt de bucket privé (geen
 * publieke CORS/PUT nodig) en laat validatie op de server plaatsvinden.
 */

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

type AllowedType = keyof typeof ALLOWED

/** Valideert een geüpload bestand en geeft de bijbehorende extensie terug. */
function validateImageFile(file: unknown): {
  file: File
  extension: string
} {
  if (!(file instanceof File)) {
    throw new Error('Er is geen geldig bestand ontvangen.')
  }
  if (!(file.type in ALLOWED)) {
    throw new Error('Gebruik een PNG-, JPG- of WebP-afbeelding.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('De afbeelding mag maximaal 5 MB groot zijn.')
  }
  return { file, extension: ALLOWED[file.type as AllowedType] }
}

/** Uploadt de bytes naar R2 en geeft de publieke URL terug. */
async function storeImage(file: File, key: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await uploadObject({ key, body: bytes, contentType: file.type })
  return getPublicUrl(key)
}

function parseOrganizationUpload(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen bestand ontvangen.')
  }
  const kind = data.get('kind')
  if (kind !== 'logo' && kind !== 'coverImage') {
    throw new Error('Onbekend soort afbeelding.')
  }
  const { file, extension } = validateImageFile(data.get('file'))
  return { file, extension, kind }
}

export const uploadOrganizationImage = createServerFn({ method: 'POST' })
  .validator(parseOrganizationUpload)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()

    const organization = await db.organization.findFirst({
      where: { ownerId: user.id, deletedAt: null },
    })

    if (!organization) {
      throw new Error('ORGANIZATION_NOT_FOUND')
    }

    const { file, extension, kind } = data
    const key = `organizations/${organization.id}/${kind}-${crypto.randomUUID()}.${extension}`
    const url = await storeImage(file, key)

    await db.organization.update({
      where: { id: organization.id },
      data: { [kind]: url },
    })

    return { url }
  })

function parseEventCoverUpload(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen bestand ontvangen.')
  }
  const eventId = data.get('eventId')
  if (typeof eventId !== 'string' || eventId === '') {
    throw new Error('Onbekend evenement.')
  }
  const { file, extension } = validateImageFile(data.get('file'))
  return { file, extension, eventId }
}

export const uploadEventCover = createServerFn({ method: 'POST' })
  .validator(parseEventCoverUpload)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()

    // Eigenaarschap: het event moet bij de organisatie van de gebruiker horen.
    const event = await db.event.findFirst({
      where: {
        id: data.eventId,
        deletedAt: null,
        organization: { ownerId: user.id, deletedAt: null },
      },
    })

    if (!event) {
      throw new Error('EVENT_NOT_FOUND')
    }

    const key = `events/${event.id}/cover-${crypto.randomUUID()}.${data.extension}`
    const url = await storeImage(data.file, key)

    await db.event.update({
      where: { id: event.id },
      data: { coverImage: url },
    })

    return { url }
  })
