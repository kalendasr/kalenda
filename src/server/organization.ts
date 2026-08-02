import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { makeUniqueSlug } from '#/lib/slug.ts'
import {
  createOrganizationSchema,
  organizationGeneralSchema,
} from '#/lib/validation/organization.ts'
import { paymentSettingsSchema } from '#/lib/validation/payment.ts'

/**
 * Server functions voor het organisatiedomein.
 *
 * Iedere mutatie loopt via `requireUser()` en werkt uitsluitend op de
 * organisatie van de ingelogde gebruiker (BR-101, security §13). MVP: precies
 * één organisatie per gebruiker (BR-100).
 */

/** De organisatie van de ingelogde gebruiker, of `null` als die nog niet bestaat. */
export const getMyOrganization = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()

    return db.organization.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      include: { paymentSettings: true },
    })
  },
)

export const createOrganization = createServerFn({ method: 'POST' })
  .validator(createOrganizationSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const existing = await db.organization.findFirst({
      where: { ownerId: user.id, deletedAt: null },
    })

    // BR-100 (MVP): één organisatie per gebruiker.
    if (existing) {
      return existing
    }

    const usedSlugs = await db.organization.findMany({
      select: { slug: true },
    })
    const taken = new Set(usedSlugs.map((row) => row.slug))
    const slug = makeUniqueSlug(data.name, (candidate) => taken.has(candidate))

    return db.organization.create({
      data: {
        name: data.name,
        slug,
        ownerId: user.id,
        // Betaalinstellingen horen bij de organisatie (BR-103) en worden
        // direct meegemaakt zodat de workspace altijd een record heeft.
        paymentSettings: { create: {} },
      },
    })
  })

/** Haalt de eigen organisatie op en garandeert eigenaarschap. */
async function requireOwnedOrganization(userId: string) {
  const organization = await db.organization.findFirst({
    where: { ownerId: userId, deletedAt: null },
  })

  if (!organization) {
    throw new Error('ORGANIZATION_NOT_FOUND')
  }

  return organization
}

export const updateOrganizationGeneral = createServerFn({ method: 'POST' })
  .validator(organizationGeneralSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    return db.organization.update({
      where: { id: organization.id },
      data: {
        name: data.name,
        description: data.description ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        facebook: data.facebook ?? null,
        instagram: data.instagram ?? null,
        tiktok: data.tiktok ?? null,
        linkedin: data.linkedin ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country,
      },
    })
  })

export const updatePaymentSettings = createServerFn({ method: 'POST' })
  .validator(paymentSettingsSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const organization = await requireOwnedOrganization(user.id)

    const values = {
      whatsappEnabled: data.whatsappEnabled,
      whatsappPhone: data.whatsappPhone ?? null,
      whatsappApps: data.whatsappApps,
      bankEnabled: data.bankEnabled,
      bankName: data.bankName ?? null,
      accountHolder: data.accountHolder ?? null,
      accountNumber: data.accountNumber ?? null,
      branch: data.branch ?? null,
      paymentInstructions: data.paymentInstructions ?? null,
    }

    return db.organizationPaymentSettings.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id, ...values },
      update: values,
    })
  })
