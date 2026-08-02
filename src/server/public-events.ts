import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { reservedByTicketType } from '#/server/reservations.server.ts'

/**
 * Publieke evenement-queries (geen authenticatie).
 *
 * Toont uitsluitend gepubliceerde, niet-verwijderde events (BR-202). Concept- en
 * gearchiveerde events lekken hier nooit. Alleen publieke velden worden
 * teruggegeven.
 */

const publishedWhere = { status: 'Published', deletedAt: null } as const

/** Lijst van gepubliceerde events voor de publieke storefront. */
export const listPublishedEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.event.findMany({
      where: publishedWhere,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        coverImage: true,
        startsAt: true,
        category: { select: { name: true, slug: true } },
        venue: { select: { name: true, district: true } },
      },
    })
  },
)

/** Eén gepubliceerd event op slug, met alle publieke details en content. */
export const getPublishedEventBySlug = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const event = await db.event.findFirst({
      where: { slug: data.slug, ...publishedWhere },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        description: true,
        coverImage: true,
        startsAt: true,
        endsAt: true,
        category: { select: { name: true, slug: true } },
        venue: {
          select: { name: true, address: true, district: true, country: true },
        },
        content: {
          where: { published: true },
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
          select: { id: true, type: true, title: true, content: true },
        },
        ticketTypes: {
          where: { visible: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            currency: true,
            quantity: true,
            minimumPerOrder: true,
            maximumPerOrder: true,
            salesStart: true,
            salesEnd: true,
            visible: true,
          },
        },
        organization: {
          select: {
            name: true,
            logo: true,
            email: true,
            phone: true,
            website: true,
            facebook: true,
            instagram: true,
            tiktok: true,
            linkedin: true,
          },
        },
      },
    })

    if (!event) return null

    // Gereserveerde aantallen meesturen zodat de publieke selector de actuele
    // beschikbaarheid toont (BR-507).
    const reserved = await reservedByTicketType(
      event.ticketTypes.map((type) => type.id),
    )

    return {
      ...event,
      ticketTypes: event.ticketTypes.map((type) => ({
        ...type,
        reserved: reserved[type.id] ?? 0,
      })),
    }
  })
