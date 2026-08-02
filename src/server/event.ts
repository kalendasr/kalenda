import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { makeUniqueSlug } from '#/lib/slug.ts'
import { surinameLocalToDate } from '#/lib/datetime.ts'
import {
  contentItemSchema,
  createEventSchema,
  eventDetailsSchema,
  venueSchema,
} from '#/lib/validation/event.ts'
import { z } from 'zod'

/**
 * Server functions voor het evenementdomein (BR-200..BR-204).
 *
 * Iedere mutatie loopt via `requireUser()` en werkt uitsluitend op events van de
 * organisatie van de ingelogde gebruiker (security §13).
 */

/** Haalt de organisatie van de gebruiker op, of gooit een fout. */
async function requireOwnedOrganization(userId: string) {
  const organization = await db.organization.findFirst({
    where: { ownerId: userId, deletedAt: null },
  })
  if (!organization) throw new Error('ORGANIZATION_NOT_FOUND')
  return organization
}

/** Haalt een event op dat aantoonbaar bij de gebruiker hoort. */
async function requireOwnedEvent(userId: string, eventId: string) {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      organization: { ownerId: userId, deletedAt: null },
    },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')
  return event
}

const eventIdSchema = z.object({ eventId: z.uuid() })

/** Alle events van de eigen organisatie (nieuwste eerst). */
export const listMyEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    return db.event.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { category: true, venue: true },
    })
  },
)

/** Eén eigen event, met content, categorie en venue. */
export const getMyEvent = createServerFn({ method: 'GET' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.findFirst({
      where: { id: data.eventId },
      include: {
        category: true,
        venue: true,
        content: { orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] },
        organization: { include: { paymentSettings: true } },
      },
    })
  })

export const createEvent = createServerFn({ method: 'POST' })
  .validator(createEventSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const usedSlugs = await db.event.findMany({ select: { slug: true } })
    const taken = new Set(usedSlugs.map((row) => row.slug))
    const slug = makeUniqueSlug(data.title, (candidate) => taken.has(candidate))

    return db.event.create({
      data: {
        organizationId: organization.id,
        title: data.title,
        slug,
      },
    })
  })

export const updateEventDetails = createServerFn({ method: 'POST' })
  .validator(eventDetailsSchema.and(z.object({ eventId: z.uuid() })))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.update({
      where: { id: data.eventId },
      data: {
        title: data.title,
        shortDescription: data.shortDescription ?? null,
        description: data.description ?? null,
        categoryId: data.categoryId ?? null,
        startsAt: surinameLocalToDate(data.startsAt),
        endsAt: surinameLocalToDate(data.endsAt),
        timezone: data.timezone,
      },
    })
  })

export const updateEventVenue = createServerFn({ method: 'POST' })
  .validator(venueSchema.and(z.object({ eventId: z.uuid() })))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const event = await requireOwnedEvent(user.id, data.eventId)

    const values = {
      name: data.name,
      address: data.address ?? null,
      district: data.district ?? null,
      country: data.country,
    }

    // Eén venue per event: bestaande bijwerken, anders aanmaken en koppelen.
    if (event.venueId) {
      return db.venue.update({ where: { id: event.venueId }, data: values })
    }

    const venue = await db.venue.create({ data: values })
    await db.event.update({
      where: { id: event.id },
      data: { venueId: venue.id },
    })
    return venue
  })

// --- Lifecycle -------------------------------------------------------------

export const publishEvent = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.update({
      where: { id: data.eventId },
      data: { status: 'Published' },
    })
  })

/** Terug naar concept (BR-203: mag zolang er geen tickets verkocht zijn). */
export const unpublishEvent = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.update({
      where: { id: data.eventId },
      data: { status: 'Draft' },
    })
  })

export const archiveEvent = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.update({
      where: { id: data.eventId },
      data: { status: 'Archived' },
    })
  })

/** Definitief verwijderen mag alleen zolang het een concept is (BR-204). */
export const deleteEvent = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const event = await requireOwnedEvent(user.id, data.eventId)

    if (event.status !== 'Draft') {
      throw new Error(
        'Een gepubliceerd evenement kan niet verwijderd worden. Archiveer het in plaats daarvan.',
      )
    }

    await db.event.update({
      where: { id: event.id },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  })

// --- Content ---------------------------------------------------------------

export const createContentItem = createServerFn({ method: 'POST' })
  .validator(contentItemSchema.and(z.object({ eventId: z.uuid() })))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    // Nieuw item onderaan zijn type plaatsen.
    const last = await db.eventContent.findFirst({
      where: { eventId: data.eventId, type: data.type },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    return db.eventContent.create({
      data: {
        eventId: data.eventId,
        type: data.type,
        title: data.title,
        content: data.content,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    })
  })

export const updateContentItem = createServerFn({ method: 'POST' })
  .validator(
    contentItemSchema
      .omit({ type: true })
      .and(z.object({ eventId: z.uuid(), itemId: z.uuid() })),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.eventContent.update({
      where: { id: data.itemId, eventId: data.eventId },
      data: { title: data.title, content: data.content },
    })
  })

export const deleteContentItem = createServerFn({ method: 'POST' })
  .validator(z.object({ eventId: z.uuid(), itemId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    await db.eventContent.delete({
      where: { id: data.itemId, eventId: data.eventId },
    })
    return { success: true }
  })

/** Wisselt de volgorde van een item met zijn buur (op of neer) binnen het type. */
export const reorderContentItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      eventId: z.uuid(),
      itemId: z.uuid(),
      direction: z.enum(['up', 'down']),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const item = await db.eventContent.findFirst({
      where: { id: data.itemId, eventId: data.eventId },
    })
    if (!item) throw new Error('CONTENT_NOT_FOUND')

    const neighbour = await db.eventContent.findFirst({
      where: {
        eventId: data.eventId,
        type: item.type,
        sortOrder:
          data.direction === 'up'
            ? { lt: item.sortOrder }
            : { gt: item.sortOrder },
      },
      orderBy: { sortOrder: data.direction === 'up' ? 'desc' : 'asc' },
    })
    if (!neighbour) return { success: true } // Al bovenaan/onderaan.

    // Volgorde omwisselen in één transactie.
    await db.$transaction([
      db.eventContent.update({
        where: { id: item.id },
        data: { sortOrder: neighbour.sortOrder },
      }),
      db.eventContent.update({
        where: { id: neighbour.id },
        data: { sortOrder: item.sortOrder },
      }),
    ])
    return { success: true }
  })
