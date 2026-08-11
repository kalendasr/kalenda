import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { requireOwnedOrganization } from '#/lib/org-guard.server.ts'
import { makeUniqueSlug } from '#/lib/slug.ts'
import { surinameLocalToDate } from '#/lib/datetime.ts'
import {
  contentItemSchema,
  createEventSchema,
  eventDetailsSchema,
  eventIntroSchema,
  venueSchema,
} from '#/lib/validation/event.ts'
import { notifyEventChanged } from '#/server/event-notifications.server.ts'
import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import {
  assertLifecycle,
  canDeleteEvent,
  canUnpublishEvent,
} from '#/lib/event-lifecycle.ts'
import { z } from 'zod'

/**
 * Server functions voor het evenementdomein (BR-200..BR-204, BR-904).
 *
 * Iedere mutatie loopt via `requireUser()` en werkt uitsluitend op events van de
 * organisatie van de ingelogde gebruiker (security §13).
 */

const eventIdSchema = z.object({ eventId: z.uuid() })

/** Is de begintijd van het event daadwerkelijk gewijzigd? */
export function hasEventTimeChanged(
  before: Date | null,
  after: Date | null,
): boolean {
  return before?.getTime() !== after?.getTime()
}

export type VenueFields = {
  name: string
  address: string | null
  district: string | null
  country: string
}

/** Is er iets aan de locatiegegevens daadwerkelijk gewijzigd? */
export function hasVenueChanged(
  before: VenueFields,
  after: VenueFields,
): boolean {
  return (
    before.name !== after.name ||
    before.address !== after.address ||
    before.district !== after.district ||
    before.country !== after.country
  )
}

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

/**
 * Alle events van de eigen organisatie, verrijkt met verkoopcijfers per event
 * (capaciteit, verkocht, omzet). Alleen gerealiseerde verkoop (Paid/Completed)
 * telt mee — dezelfde regel als de rapportages. Read-only aggregatie voor de
 * evenementenlijst en het dashboard.
 */
export const listMyEventsSummary = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const events = await db.event.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        venue: true,
        ticketTypes: {
          where: { deletedAt: null },
          select: {
            quantity: true,
            orderItems: {
              where: {
                order: {
                  deletedAt: null,
                  orderStatus: { in: ['Paid', 'Completed'] },
                },
              },
              select: { quantity: true, unitPriceCents: true },
            },
          },
        },
      },
    })

    return events.map((event) => {
      let capacity = 0
      let sold = 0
      let revenueCents = 0
      for (const type of event.ticketTypes) {
        capacity += type.quantity
        for (const item of type.orderItems) {
          sold += item.quantity
          revenueCents += item.quantity * item.unitPriceCents
        }
      }
      const { ticketTypes, ...rest } = event
      return { ...rest, capacity, sold, revenueCents }
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
        ticketTypes: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
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
    const before = await requireOwnedEvent(user.id, data.eventId)

    const startsAt = surinameLocalToDate(data.startsAt)
    const event = await db.event.update({
      where: { id: data.eventId },
      data: {
        title: data.title,
        categoryId: data.categoryId ?? null,
        startsAt,
        endsAt: surinameLocalToDate(data.endsAt),
        timezone: data.timezone,
      },
    })

    if (
      before.status === 'Published' &&
      hasEventTimeChanged(before.startsAt, startsAt)
    ) {
      await notifyEventChanged(event.id, event.title, 'time')
    }

    return event
  })

/** Introductie (korte + lange omschrijving), beheerd vanuit de Inhoud-tab. */
export const updateEventIntro = createServerFn({ method: 'POST' })
  .validator(eventIntroSchema.and(z.object({ eventId: z.uuid() })))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.event.update({
      where: { id: data.eventId },
      data: {
        shortDescription: data.shortDescription ?? null,
        description: data.description ?? null,
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
      const before = await db.venue.findUnique({ where: { id: event.venueId } })
      const venue = await db.venue.update({
        where: { id: event.venueId },
        data: values,
      })

      const changed = before !== null && hasVenueChanged(before, venue)
      if (event.status === 'Published' && changed) {
        await notifyEventChanged(event.id, event.title, 'venue')
      }

      return venue
    }

    const venue = await db.venue.create({ data: values })
    await db.event.update({
      where: { id: event.id },
      data: { venueId: venue.id },
    })
    return venue
  })

// --- Lifecycle -------------------------------------------------------------

/** Publiceren mag alleen als de checklist compleet is (BR-201) — de client
 * disablet de knop hierop, maar server functions zijn direct aanroepbaar. */
export const publishEvent = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const event = await db.event.findFirst({
      where: { id: data.eventId, deletedAt: null },
      include: {
        _count: { select: { ticketTypes: { where: { deletedAt: null } } } },
        organization: { select: { paymentSettings: true } },
      },
    })
    if (!event) throw new Error('EVENT_NOT_FOUND')

    const readiness = eventPublishReadiness(
      {
        title: event.title,
        shortDescription: event.shortDescription,
        description: event.description,
        startsAt: event.startsAt,
        categoryId: event.categoryId,
        venueId: event.venueId,
        coverImage: event.coverImage,
        ticketTypeCount: event._count.ticketTypes,
      },
      event.organization.paymentSettings,
    )
    if (!readiness.ready) {
      throw new Error(
        `Evenement is nog niet compleet: ${readiness.missing.map((item) => item.label).join(', ')}.`,
      )
    }

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

    const ticketCount = await db.ticket.count({
      where: {
        orderItem: {
          order: { eventId: data.eventId, deletedAt: null },
        },
      },
    })
    assertLifecycle(canUnpublishEvent({ ticketCount }))

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

    const orderCount = await db.order.count({
      where: { eventId: event.id, deletedAt: null },
    })
    assertLifecycle(canDeleteEvent({ status: event.status, orderCount }))

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
