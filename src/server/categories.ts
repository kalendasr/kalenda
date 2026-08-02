import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'

/** Actieve evenementcategorieën (geseed, DATABASE_DOMAIN.md §15). */
export const listCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.category.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    })
  },
)
