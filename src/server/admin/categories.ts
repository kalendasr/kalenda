import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { makeUniqueSlug } from '#/lib/slug.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import { categoryInputSchema } from '#/lib/validation/admin.ts'

/**
 * Categoriebeheer (Fase 12) — de enige platforminstelling die dit datamodel
 * echt kent.
 *
 * Categorieën zijn tot nu toe alleen via een seed-migratie ontstaan, terwijl
 * publiceren van een evenement wél een categorie vereist en de storefront
 * erop filtert. Dit is dus een instelling met aantoonbaar effect, in
 * tegenstelling tot platformnaam of feature flags — die bestaan nergens in de
 * architectuur en krijgen daarom ook geen scherm.
 *
 * Categorieën worden nooit verwijderd, alleen op inactief gezet: bestaande
 * evenementen verwijzen ernaar.
 */

export const listCategoriesAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    return db.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        sortOrder: true,
        active: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    })
  },
)

export const createCategory = createServerFn({ method: 'POST' })
  .validator(categoryInputSchema)
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin()

    const existing = new Set(
      (await db.category.findMany({ select: { slug: true } })).map(
        (category) => category.slug,
      ),
    )
    const slug = makeUniqueSlug(data.name, (candidate) =>
      existing.has(candidate),
    )

    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        icon: data.icon || null,
        sortOrder: data.sortOrder,
        active: data.active,
      },
      select: { id: true, name: true },
    })

    await writeAuditLog({
      actorId: admin.id,
      action: 'CategoryCreated',
      targetType: 'Category',
      targetId: category.id,
      targetLabel: category.name,
      metadata: { slug, sortOrder: data.sortOrder, active: data.active },
    })

    return category
  })

export const updateCategory = createServerFn({ method: 'POST' })
  .validator(categoryInputSchema.extend({ categoryId: z.uuid() }))
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin()

    const before = await db.category.findFirst({
      where: { id: data.categoryId, deletedAt: null },
      select: {
        id: true,
        name: true,
        icon: true,
        sortOrder: true,
        active: true,
      },
    })
    if (!before) throw new Error('CATEGORY_NOT_FOUND')

    await db.category.update({
      where: { id: before.id },
      data: {
        name: data.name,
        icon: data.icon || null,
        sortOrder: data.sortOrder,
        active: data.active,
      },
    })

    await writeAuditLog({
      actorId: admin.id,
      action: 'CategoryUpdated',
      targetType: 'Category',
      targetId: before.id,
      targetLabel: data.name,
      metadata: {
        before: {
          name: before.name,
          sortOrder: before.sortOrder,
          active: before.active,
        },
        after: {
          name: data.name,
          sortOrder: data.sortOrder,
          active: data.active,
        },
      },
    })

    return { success: true }
  })
