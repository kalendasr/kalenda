import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { reservedByTicketType } from '#/server/reservations.server.ts'
import { eventAvailability } from '#/lib/ticket-sales.ts'

/**
 * Publieke evenement-queries (geen authenticatie).
 *
 * Toont uitsluitend gepubliceerde, niet-verwijderde events (BR-202). Concept- en
 * gearchiveerde events lekken hier nooit. Alleen publieke velden worden
 * teruggegeven.
 */

const publishedWhere = {
  status: 'Published',
  deletedAt: null,
  organization: { deletedAt: null },
} as const

/**
 * Lijst van gepubliceerde events voor de publieke storefront (homepage én
 * zoekpagina). Per event wordt de laagste zichtbare ticketprijs afgeleid
 * (`priceFromCents`) zodat kaarten een "vanaf"-prijs kunnen tonen zonder de
 * volledige ticketstructuur te lekken. Ook wordt de resterende capaciteit
 * (quantity minus gereserveerd, BR-507) samengevat tot `almostSoldOut` voor
 * het "Bijna uitverkocht"-label. Bedragen blijven SRD-centen.
 */
export const listPublishedEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
    const events = await db.event.findMany({
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
        ticketTypes: {
          where: { visible: true, deletedAt: null },
          select: { id: true, priceCents: true, quantity: true },
        },
      },
    })

    const reserved = await reservedByTicketType(
      events.flatMap((event) => event.ticketTypes.map((type) => type.id)),
    )

    return events.map(({ ticketTypes, ...event }) => {
      const { priceFromCents, isFree, almostSoldOut } = eventAvailability(
        ticketTypes.map((type) => ({
          ...type,
          reserved: reserved[type.id] ?? 0,
        })),
      )
      return { ...event, priceFromCents, isFree, almostSoldOut }
    })
  },
)

/**
 * Actieve categorieën met het aantal gepubliceerde events erin, voor de
 * categoriebrowser op de homepage en de filters op de zoekpagina.
 */
export const listPublishedCategories = createServerFn({
  method: 'GET',
}).handler(async () => {
  const categories = await db.category.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      _count: { select: { events: { where: publishedWhere } } },
    },
  })

  return categories.map(({ _count, ...category }) => ({
    ...category,
    count: _count.events,
  }))
})

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
            _count: { select: { events: { where: publishedWhere } } },
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
    const ticketTypes = event.ticketTypes.map((type) => ({
      ...type,
      reserved: reserved[type.id] ?? 0,
    }))
    const { organization: org, ...rest } = event
    const { _count, ...organization } = org

    return {
      ...rest,
      ticketTypes,
      availability: eventAvailability(ticketTypes),
      organization: { ...organization, eventCount: _count.events },
    }
  })
