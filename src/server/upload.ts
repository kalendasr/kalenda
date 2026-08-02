import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { getPublicUrl, uploadObject } from '#/lib/storage.server.ts'

/**
 * Uploaden van organisatie-afbeeldingen (logo en coverfoto) naar R2.
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

function parseUpload(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen bestand ontvangen.')
  }

  const file = data.get('file')
  const kind = data.get('kind')

  if (!(file instanceof File)) {
    throw new Error('Er is geen geldig bestand ontvangen.')
  }

  if (kind !== 'logo' && kind !== 'coverImage') {
    throw new Error('Onbekend soort afbeelding.')
  }

  if (!(file.type in ALLOWED)) {
    throw new Error('Gebruik een PNG-, JPG- of WebP-afbeelding.')
  }

  if (file.size > MAX_BYTES) {
    throw new Error('De afbeelding mag maximaal 5 MB groot zijn.')
  }

  return { file, kind }
}

export const uploadOrganizationImage = createServerFn({ method: 'POST' })
  .validator(parseUpload)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()

    const organization = await db.organization.findFirst({
      where: { ownerId: user.id, deletedAt: null },
    })

    if (!organization) {
      throw new Error('ORGANIZATION_NOT_FOUND')
    }

    const { file, kind } = data
    const extension = ALLOWED[file.type as AllowedType]
    const key = `organizations/${organization.id}/${kind}-${crypto.randomUUID()}.${extension}`

    const bytes = new Uint8Array(await file.arrayBuffer())
    await uploadObject({ key, body: bytes, contentType: file.type })

    const url = getPublicUrl(key)

    await db.organization.update({
      where: { id: organization.id },
      data: { [kind]: url },
    })

    return { url }
  })
