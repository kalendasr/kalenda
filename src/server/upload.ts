import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedOrganization } from '#/lib/org-guard.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { getPublicUrl, uploadObject } from '#/lib/storage.server.ts'
import { validateImageFile } from '#/lib/upload-file.server.ts'

/**
 * Uploaden van afbeeldingen (organisatie-branding en event-covers) naar R2.
 *
 * De bytes lopen via de server function naar R2. Dat houdt de bucket privé (geen
 * publieke CORS/PUT nodig) en laat validatie op de server plaatsvinden.
 */

/** Uploadt de bytes naar R2 en geeft de publieke URL terug. */
async function storeImage(file: File, key: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await uploadObject({ key, body: bytes, contentType: file.type })
  return getPublicUrl(key)
}

async function parseOrganizationUpload(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen bestand ontvangen.')
  }
  const kind = data.get('kind')
  if (kind !== 'logo' && kind !== 'coverImage') {
    throw new Error('Onbekend soort afbeelding.')
  }
  const { file, extension } = await validateImageFile(data.get('file'))
  return { file, extension, kind }
}

export const uploadOrganizationImage = createServerFn({ method: 'POST' })
  .validator(parseOrganizationUpload)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const { file, extension, kind } = data
    const key = `organizations/${organization.id}/${kind}-${crypto.randomUUID()}.${extension}`
    const url = await storeImage(file, key)

    await db.organization.update({
      where: { id: organization.id },
      data: { [kind]: url },
    })

    return { url }
  })

async function parseEventCoverUpload(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen bestand ontvangen.')
  }
  const eventId = data.get('eventId')
  if (typeof eventId !== 'string' || eventId === '') {
    throw new Error('Onbekend evenement.')
  }
  const { file, extension } = await validateImageFile(data.get('file'))
  return { file, extension, eventId }
}

export const uploadEventCover = createServerFn({ method: 'POST' })
  .validator(parseEventCoverUpload)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()
    const event = await requireOwnedEvent(user.id, data.eventId)

    const key = `events/${event.id}/cover-${crypto.randomUUID()}.${data.extension}`
    const url = await storeImage(data.file, key)

    await db.event.update({
      where: { id: event.id },
      data: { coverImage: url },
    })

    return { url }
  })
