import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  normalizeSearch,
  paginationSchema,
  toSkipTake,
} from '#/lib/pagination.ts'

describe('paginationSchema', () => {
  it('vult standaardwaarden aan wanneer er niets in de URL staat', () => {
    expect(paginationSchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('accepteert een paginanummer als string uit de URL', () => {
    expect(paginationSchema.parse({ page: '3' }).page).toBe(3)
  })

  it('valt terug op pagina 1 bij onzin', () => {
    expect(paginationSchema.parse({ page: 'abc' }).page).toBe(1)
    expect(paginationSchema.parse({ page: -5 }).page).toBe(1)
    expect(paginationSchema.parse({ page: 0 }).page).toBe(1)
  })

  it('weigert een zelfbedachte paginagrootte (parametermanipulatie)', () => {
    expect(paginationSchema.parse({ pageSize: 100000 }).pageSize).toBe(
      DEFAULT_PAGE_SIZE,
    )
    expect(paginationSchema.parse({ pageSize: 1 }).pageSize).toBe(
      DEFAULT_PAGE_SIZE,
    )
  })

  it('laat de toegestane paginagroottes door', () => {
    for (const size of [25, 50, 100] as const) {
      expect(paginationSchema.parse({ pageSize: size }).pageSize).toBe(size)
    }
  })
})

describe('toSkipTake', () => {
  it('vertaalt pagina en paginagrootte naar skip/take', () => {
    expect(toSkipTake({ page: 1, pageSize: 25 })).toEqual({ skip: 0, take: 25 })
    expect(toSkipTake({ page: 3, pageSize: 50 })).toEqual({
      skip: 100,
      take: 50,
    })
  })

  it('klemt een ongeldige pagina in plaats van te falen', () => {
    expect(toSkipTake({ page: 0, pageSize: 25 })).toEqual({ skip: 0, take: 25 })
  })
})

describe('buildPageMeta', () => {
  it('berekent het zichtbare bereik', () => {
    const meta = buildPageMeta(120, { page: 2, pageSize: 25 })

    expect(meta.pageCount).toBe(5)
    expect(meta.from).toBe(26)
    expect(meta.to).toBe(50)
    expect(meta.hasPrevious).toBe(true)
    expect(meta.hasNext).toBe(true)
  })

  it('geeft een bruikbare lege staat zonder resultaten', () => {
    const meta = buildPageMeta(0, { page: 1, pageSize: 25 })

    expect(meta).toMatchObject({
      pageCount: 1,
      from: 0,
      to: 0,
      hasPrevious: false,
      hasNext: false,
    })
  })

  it('telt de laatste pagina niet verder dan het totaal', () => {
    const meta = buildPageMeta(30, { page: 2, pageSize: 25 })

    expect(meta.from).toBe(26)
    expect(meta.to).toBe(30)
    expect(meta.hasNext).toBe(false)
  })

  it('corrigeert naar de laatste pagina wanneer de gevraagde niet bestaat', () => {
    const meta = buildPageMeta(30, { page: 9, pageSize: 25 })

    expect(meta.page).toBe(2)
    expect(meta.hasNext).toBe(false)
  })
})

describe('normalizeSearch', () => {
  it('negeert lege en te korte zoektermen', () => {
    expect(normalizeSearch(undefined)).toBeNull()
    expect(normalizeSearch('   ')).toBeNull()
    expect(normalizeSearch('a')).toBeNull()
  })

  it('trimt een bruikbare zoekterm', () => {
    expect(normalizeSearch('  kim  ')).toBe('kim')
  })
})
