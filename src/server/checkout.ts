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
import {
  ALMOST_SOLD_OUT_THRESHOLD,
  availableQuantity,
  isOnSale,
} from '#/lib/ticket-sales.ts'
import { lowStockKey, soldOutKey } from '#/lib/notifications/claim-key.ts'
import { reservedByTicketType } from '#/server/reservations.server.ts'
import { claimNotification, notify } from '#/server/notifications.server.ts'
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
          requestedQuantity: item.quantity,
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
      const reserved = await reservedByTicketType(ids, now, tx)

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

      // Uniek ordernummer (BR-500). We genereren en schrijven direct, en vangen
      // een P2002 (unique-botsing) op om opnieuw te proberen. Een read-vooraf
      // dekt de gelijktijdige race niet — twee transacties kunnen beiden "vrij"
      // zien; de unique-constraint is de echte grens en vangt de verliezer.
      let number = generateOrderNumber()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
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
              // Betaaladministratie (Fase 5): één Payment per order, aangemaakt
              // bij checkout in de toestand Waiting (BR-602/603).
              payment: {
                create: { method: data.paymentMethod },
              },
            },
          })
          break
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            number = generateOrderNumber()
            continue
          }
          throw err
        }
      }

      return number
    })

    // Bevestigingsmail + pushmeldingen na commit; een fout hier mag de order
    // niet ongedaan maken (zelfde reden als de e-mail: geen HTTP-round-trips
    // binnen de transactie met rij-locks open, CLAUDE.md §5).
    try {
      const url = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${orderNumber}`
      const order = await db.order.findUnique({
        where: { orderNumber },
        include: {
          event: { include: { organization: { select: { ownerId: true } } } },
          customer: true,
          items: { include: { ticketType: true } },
        },
      })
      if (order) {
        await sendOrderConfirmationEmail({
          to: order.customer.email,
          orderNumber,
          eventTitle: order.event.title,
          totalCents: order.totalCents,
          url,
        })

        await notify(
          'order.created',
          { kind: 'user', userId: order.event.organization.ownerId },
          {
            eventId: order.eventId,
            eventTitle: order.event.title,
            orderNumber,
            totalCents: order.totalCents,
          },
        )

        // Bijna-uitverkocht / uitverkocht: per gekocht tickettype eenmalig
        // melden zodra de drempel gepasseerd is (dedup via NotificationLog).
        const reserved = await reservedByTicketType(
          order.items.map((item) => item.ticketTypeId),
        )
        for (const item of order.items) {
          const remaining = availableQuantity(
            item.ticketType,
            reserved[item.ticketTypeId] ?? 0,
          )
          if (remaining > ALMOST_SOLD_OUT_THRESHOLD) continue
          const key =
            remaining === 0
              ? soldOutKey(item.ticketTypeId)
              : lowStockKey(item.ticketTypeId)
          if (await claimNotification('tickets.low_stock', key)) {
            await notify(
              'tickets.low_stock',
              { kind: 'user', userId: order.event.organization.ownerId },
              {
                eventId: order.eventId,
                ticketTypeName: item.ticketType.name,
                remaining,
              },
            )
          }
        }
      }
    } catch {
      // Stil: de order staat; de klant heeft ook de orderlink op het scherm.
    }

    return { orderNumber }
  })

export const getOrderByNumber = createServerFn({ method: 'GET' })
  .validator(z.object({ orderNumber: z.string().min(1) }))
  .handler(async ({ data }) => {
    const order = await db.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: {
        customer: true,
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
                sentAt: true,
              },
            },
          },
        },
        payment: {
          select: {
            state: true,
            reference: true,
            notes: true,
            requestedAt: true,
          },
        },
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
    if (!order) return null

    // `baseUrl` wordt op de orderpagina gebruikt om dezelfde QR-payload op te
    // bouwen als op de server-PDF (ticketQrPayload).
    return { ...order, baseUrl: getServerEnv().BETTER_AUTH_URL }
  })
