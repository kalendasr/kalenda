import { z } from 'zod'

/**
 * Paginatie voor beheerderslijsten (Fase 12).
 *
 * Offset-paginatie, bewust geen cursor: de adminlijsten zijn sorteerbaar en
 * doorzoekbaar, en een beheerder wil naar "pagina 7" kunnen springen. Cursor
 * zou dat onmogelijk maken en levert hier weinig op, omdat elke lijst al
 * indexgedreven gefilterd wordt.
 *
 * De paginagrootte is een gesloten verzameling in plaats van een vrij getal:
 * zo kan niemand via de URL `pageSize=100000` afdwingen en de database
 * platleggen (Fase 16 — parametermanipulatie).
 *
 * Puur en zonder afhankelijkheden op de database, zodat het los te testen is.
 */

export const PAGE_SIZES = [25, 50, 100] as const

export type PageSize = (typeof PAGE_SIZES)[number]

export const DEFAULT_PAGE_SIZE: PageSize = 25

/**
 * Schema voor de paginatie-search-params van een route én voor de validator
 * van de bijbehorende server function. Beide kanten valideren; de UI mag
 * nooit de enige bewaker zijn.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z
    .union([z.literal(25), z.literal(50), z.literal(100)])
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export type PageMeta = {
  page: number
  pageSize: PageSize
  total: number
  pageCount: number
  hasPrevious: boolean
  hasNext: boolean
  /** 1-gebaseerde index van de eerste rij op deze pagina; 0 bij een lege lijst. */
  from: number
  /** 1-gebaseerde index van de laatste rij op deze pagina; 0 bij een lege lijst. */
  to: number
}

/**
 * Zet paginatie-input om naar Prisma's `skip`/`take`. Waarden buiten bereik
 * worden geklemd in plaats van geweigerd: een verkeerde `page` in de URL hoort
 * een lege pagina op te leveren, geen foutscherm.
 */
export function toSkipTake(input: PaginationInput): {
  skip: number
  take: number
} {
  const page = clampPage(input.page)
  const pageSize = clampPageSize(input.pageSize)

  return { skip: (page - 1) * pageSize, take: pageSize }
}

/**
 * Bouwt de paginameta voor de UI. Wanneer de gevraagde pagina voorbij het
 * einde ligt (bijv. na het aanscherpen van een filter) tellen we terug naar de
 * laatste bestaande pagina, zodat de gebruiker geen dood scherm ziet.
 */
export function buildPageMeta(total: number, input: PaginationInput): PageMeta {
  const pageSize = clampPageSize(input.pageSize)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(clampPage(input.page), pageCount)

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = total === 0 ? 0 : Math.min(page * pageSize, total)

  return {
    page,
    pageSize,
    total,
    pageCount,
    hasPrevious: page > 1,
    hasNext: page < pageCount,
    from,
    to,
  }
}

function clampPage(page: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.max(1, Math.floor(page))
}

function clampPageSize(pageSize: number): PageSize {
  const match = PAGE_SIZES.find((size) => size === pageSize)
  return match ?? DEFAULT_PAGE_SIZE
}

/**
 * Normaliseert een zoekterm: lege of te korte termen leveren `null` op, zodat
 * de aanroeper de zoekvoorwaarde helemaal weglaat in plaats van op `%%` te
 * filteren. Eén letter is te weinig — dat scant zonder te selecteren.
 */
export function normalizeSearch(term: string | undefined): string | null {
  const trimmed = term?.trim() ?? ''
  return trimmed.length >= 2 ? trimmed : null
}
