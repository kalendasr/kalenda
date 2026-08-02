import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { Prisma } from '#/generated/prisma/client.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import {
  checkoutSchema,
  checkoutItemSchema,
} from '#/lib/validation/checkout.ts'
import { generateOrderNumber } from '#/lib/order-number.ts'
import { availableQuantity, isOnSale } from '#/lib/ticket-sales.ts'
import { reservedByTicketType } from '#/server/reservations.server.ts'
import { sendOrderConfirmationEmail } from '#/lib/emails.server.ts'

/**
 * Publieke checkout (geen auth). Bezoekers plaatsen een gastbestelling
 * (BR-400/403). Een order reserveert direct capaciteit binnen een transactie
 * met rij-locks, zodat er niet overboekt kan worden.
 */

const ORDER_TTL_MS = 48 * 60 * 60 * 1000 // 48 uur (BR-506)

const itemsParam = z.object({
  slug: z.string().min(1),
  items: z.array(checkoutItemSchema),
})

/** Gegevens om de checkoutpagina te tonen: event, geselecteerde types, opties. */
export const getCheckoutData = createServerFn({ method: 'GET' })
  .validator(itemsParam)
  .handler(async ({ data }) => {
    const event = await db.event.findFirst({
      where: { slug: data.slug, status: 'Published', deletedAt: null },
      include: { organization: { include: { paymentSettings: true } } },
    })
    if (!event) return null

    const ids = data.items.map((item) => item.ticketTypeId)
    const types = await db.ticketType.findMany({
      where: {
        id: { in: ids },
        eventId: event.id,
        visible: true,
        deletedAt: null,
      },
    })
    const reserved = await reservedByTicketType(ids)

    const lines = data.items
      .map((item) => {
        const type = types.find((t) => t.id === item.ticketTypeId)
        if (!type) return null
        const available = availableQuantity(type, reserved[type.id] ?? 0)
        const quantity = Math.min(item.quantity, available)
        if (quantity < 1) return null
        return {
          ticketTypeId: type.id,
          name: type.name,
          unitPriceCents: type.priceCents,
          quantity,
          totalPriceCents: type.priceCents * quantity,
          available,
        }
      })
      .filter((line): line is NonNullable<typeof line> => line !== null)

    const subtotalCents = lines.reduce((sum, l) => sum + l.totalPriceCents, 0)
    const settings = event.organization.paymentSettings

    return {
      event: { title: event.title, slug: event.slug },
      lines,
      subtotalCents,
      payment: {
        whatsappEnabled: settings?.whatsappEnabled ?? false,
        whatsappApps: settings?.whatsappApps ?? [],
        bankEnabled: settings?.bankEnabled ?? false,
      },
    }
  })

export const createOrder = createServerFn({ method: 'POST' })
  .validator(checkoutSchema.and(z.object({ slug: z.string().min(1) })))
  .handler(async ({ data }): Promise<{ orderNumber: string }> => {
    const now = new Date()

    const orderNumber = await db.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { slug: data.slug, status: 'Published', deletedAt: null },
        include: { organization: { include: { paymentSettings: true } } },
      })
      if (!event) throw new Error('Dit evenement is niet (meer) beschikbaar.')

      const settings = event.organization.paymentSettings
      // Gekozen betaalmethode moet door de organisatie zijn ingeschakeld.
      if (data.paymentMethod === 'WhatsApp') {
        if (!settings?.whatsappEnabled) {
          throw new Error('WhatsApp-betaling is niet beschikbaar.')
        }
        if (
          !data.paymentApp ||
          !settings.whatsappApps.includes(data.paymentApp)
        ) {
          throw new Error('Kies een geldige betaalapp.')
        }
      } else if (!settings?.bankEnabled) {
        throw new Error('Bankoverschrijving is niet beschikbaar.')
      }

      const ids = data.items.map((item) => item.ticketTypeId)

      // Rij-locks op de tickettypes: serialiseert gelijktijdige orders voor
      // dezelfde tickets, zodat de beschikbaarheidscheck niet overboekt.
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM ticket_type WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`,
      )

      const types = await tx.ticketType.findMany({
        where: {
          id: { in: ids },
          eventId: event.id,
          visible: true,
          deletedAt: null,
        },
      })
      const reserved = await reservedByTicketType(ids, now)

      const orderItems = data.items.map((item) => {
        const type = types.find((t) => t.id === item.ticketTypeId)
        if (!type) throw new Error('Een gekozen ticket bestaat niet meer.')
        if (
          !isOnSale(
            {
              quantity: type.quantity,
              visible: type.visible,
              salesStart: type.salesStart,
              salesEnd: type.salesEnd,
            },
            now,
            reserved[type.id] ?? 0,
          )
        ) {
          throw new Error(`"${type.name}" is niet meer in de verkoop.`)
        }
        if (
          item.quantity < type.minimumPerOrder ||
          item.quantity > type.maximumPerOrder
        ) {
          throw new Error(
            `Voor "${type.name}" kun je ${type.minimumPerOrder} tot ${type.maximumPerOrder} tickets bestellen.`,
          )
        }
        const available = availableQuantity(type, reserved[type.id] ?? 0)
        if (item.quantity > available) {
          throw new Error(
            `Niet genoeg tickets beschikbaar voor "${type.name}".`,
          )
        }
        return {
          ticketTypeId: type.id,
          quantity: item.quantity,
          unitPriceCents: type.priceCents,
          totalPriceCents: type.priceCents * item.quantity,
        }
      })

      const subtotalCents = orderItems.reduce(
        (sum, i) => sum + i.totalPriceCents,
        0,
      )

      const customer = await tx.customer.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        },
      })

      // Uniek ordernummer (BR-500), met een paar pogingen bij een botsing.
      let number = generateOrderNumber()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.order.findUnique({
          where: { orderNumber: number },
        })
        if (!clash) break
        number = generateOrderNumber()
      }

      await tx.order.create({
        data: {
          eventId: event.id,
          customerId: customer.id,
          orderNumber: number,
          paymentMethod: data.paymentMethod,
          paymentApp:
            data.paymentMethod === 'WhatsApp' ? data.paymentApp : null,
          subtotalCents,
          totalCents: subtotalCents, // servicefee 0 in de MVP (BR-608)
          expiresAt: new Date(now.getTime() + ORDER_TTL_MS),
          items: { create: orderItems },
        },
      })

      return number
    })

    // Bevestigingsmail na commit; een mailfout mag de order niet ongedaan maken.
    try {
      const url = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${orderNumber}`
      const order = await db.order.findUnique({
        where: { orderNumber },
        include: { event: true, customer: true },
      })
      if (order) {
        await sendOrderConfirmationEmail({
          to: order.customer.email,
          orderNumber,
          eventTitle: order.event.title,
          totalCents: order.totalCents,
          url,
        })
      }
    } catch {
      // Stil: de order staat; de klant heeft ook de orderlink op het scherm.
    }

    return { orderNumber }
  })

export const getOrderByNumber = createServerFn({ method: 'GET' })
  .validator(z.object({ orderNumber: z.string().min(1) }))
  .handler(async ({ data }) => {
    return db.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: {
        customer: true,
        items: { include: { ticketType: { select: { name: true } } } },
        event: {
          select: {
            title: true,
            slug: true,
            startsAt: true,
            venue: { select: { name: true, district: true } },
            organization: {
              select: {
                name: true,
                phone: true,
                paymentSettings: true,
              },
            },
          },
        },
      },
    })
  })
