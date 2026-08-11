import { buildPageMeta, toSkipTake } from '#/lib/pagination.ts'
import type { PageMeta, PaginationInput } from '#/lib/pagination.ts'

/**
 * Gedeelde bouwstenen voor de beheerderslijsten (Fase 12).
 *
 * Elke lijst in het adminworkspace heeft dezelfde vorm — zoeken, filteren,
 * sorteren, pagineren — en dezelfde valkuil: een ongebonden `findMany` die
 * bij honderdduizenden rijen omvalt. Deze helpers maken dat patroon één keer
 * goed, zodat geen enkele lijst het zelf hoeft uit te vinden.
 */

export type PagedResult<T> = {
  rows: Array<T>
  meta: PageMeta
}

/**
 * Voert de lijstquery en de telling parallel uit en levert rijen plus
 * paginameta.
 *
 * Wanneer de gevraagde pagina voorbij het einde ligt — wat gebeurt zodra een
 * beheerder op pagina 8 een filter aanscherpt — corrigeert `buildPageMeta`
 * naar de laatste bestaande pagina. In dat (zeldzame) geval halen we de rijen
 * opnieuw op, zodat wat de gebruiker ziet altijd overeenkomt met de
 * paginatiebalk eronder.
 */
export async function paginateQuery<T>(
  input: PaginationInput,
  query: {
    findMany: (args: { skip: number; take: number }) => Promise<Array<T>>
    count: () => Promise<number>
  },
): Promise<PagedResult<T>> {
  const requested = toSkipTake(input)

  const [rows, total] = await Promise.all([
    query.findMany(requested),
    query.count(),
  ])

  const meta = buildPageMeta(total, input)

  if (rows.length === 0 && total > 0 && meta.page < input.page) {
    const corrected = toSkipTake({ page: meta.page, pageSize: meta.pageSize })
    return { rows: await query.findMany(corrected), meta }
  }

  return { rows, meta }
}

/** Case-insensitive `contains` — leunt op de trigram-indexen uit fase 12. */
export function containsInsensitive(term: string) {
  return { contains: term, mode: 'insensitive' as const }
}
