import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'

import {
  listPublishedCategories,
  listPublishedEvents,
} from '#/server/public-events.ts'
import { formatSrd } from '#/lib/money.ts'
import { isSurinameToday, isSurinameWeekend } from '#/lib/datetime.ts'
import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'
import { EventCard } from '#/components/public/event-card.tsx'
import {
  AppErrorPage,
  StorefrontPendingState,
} from '#/components/app/full-page-states.tsx'

type SortOption = 'relevantie' | 'datum' | 'prijs'
type PayFilter = 'gratis' | 'betaald'
type DateFilter = 'vandaag' | 'weekend'

// Alle velden zijn optioneel in het type (met defaults bij het lezen), zodat
// een kale `<Link to="/evenementen">` zonder search-object blijft type-checken.
type SearchState = {
  q?: string
  cat?: Array<string>
  date?: DateFilter
  pay?: PayFilter
  priceMax?: number
  sort?: SortOption
  page?: number
}

const PAGE_SIZE = 9
const MAX_PRICE_CENTS = 250_000 // SRD 2.500, zelfde bovengrens als het mockup-slider bereik.

function toStringArray(value: unknown): Array<string> {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string')
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

export const Route = createFileRoute('/evenementen/')({
  validateSearch: (search: Record<string, unknown>): SearchState => ({
    q: typeof search.q === 'string' ? search.q : '',
    cat: toStringArray(search.cat),
    date:
      search.date === 'vandaag' || search.date === 'weekend'
        ? search.date
        : undefined,
    pay:
      search.pay === 'gratis' || search.pay === 'betaald'
        ? search.pay
        : undefined,
    priceMax: typeof search.priceMax === 'number' ? search.priceMax : undefined,
    sort:
      search.sort === 'datum' || search.sort === 'prijs'
        ? search.sort
        : 'relevantie',
    page: typeof search.page === 'number' && search.page > 0 ? search.page : 1,
  }),
  loader: async () => ({
    events: await listPublishedEvents(),
    categories: await listPublishedCategories(),
  }),
  head: () => ({
    meta: [{ title: 'Evenementen · Kalenda' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  component: PublicEvents,
  pendingComponent: () => <StorefrontPendingState cards={6} />,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage error={error} reset={reset} />
  ),
})

function matchesDateFilter(startsAt: Date | string | null, filter: DateFilter) {
  if (!startsAt) return false
  const start = new Date(startsAt)
  return filter === 'vandaag'
    ? isSurinameToday(start)
    : isSurinameWeekend(start)
}

function PublicEvents() {
  const { events, categories } = Route.useLoaderData()
  const rawSearch = Route.useSearch()
  const navigate = Route.useNavigate()

  // Genormaliseerde defaults; validateSearch levert dezelfde waarden op runtime,
  // maar het type blijft optioneel zodat `<Link to="/evenementen">` zonder
  // search-object kan.
  const search = {
    q: rawSearch.q ?? '',
    cat: rawSearch.cat ?? [],
    date: rawSearch.date,
    pay: rawSearch.pay,
    priceMax: rawSearch.priceMax,
    sort: rawSearch.sort ?? 'relevantie',
    page: rawSearch.page ?? 1,
  }

  function updateSearch(patch: Partial<SearchState>) {
    navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    })
  }

  const filtered = useMemo(() => {
    let result = events

    if (search.q.trim()) {
      const q = search.q.trim().toLowerCase()
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(q) ||
          event.venue?.name.toLowerCase().includes(q),
      )
    }

    if (search.cat.length > 0) {
      result = result.filter(
        (event) => event.category && search.cat.includes(event.category.slug),
      )
    }

    if (search.date) {
      const dateFilter = search.date
      result = result.filter((event) =>
        matchesDateFilter(event.startsAt, dateFilter),
      )
    }

    if (search.pay === 'gratis') {
      result = result.filter((event) => event.isFree)
    } else if (search.pay === 'betaald') {
      result = result.filter((event) => !event.isFree)
    }

    if (
      typeof search.priceMax === 'number' &&
      search.priceMax < MAX_PRICE_CENTS
    ) {
      const priceMax = search.priceMax
      result = result.filter(
        (event) =>
          event.priceFromCents === null || event.priceFromCents <= priceMax,
      )
    }

    const sorted = [...result]
    if (search.sort === 'datum') {
      sorted.sort((a, b) => {
        if (!a.startsAt) return 1
        if (!b.startsAt) return -1
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      })
    } else if (search.sort === 'prijs') {
      sorted.sort((a, b) => {
        if (a.priceFromCents === null) return 1
        if (b.priceFromCents === null) return -1
        return a.priceFromCents - b.priceFromCents
      })
    }

    return sorted
  }, [
    events,
    search.q,
    search.cat,
    search.date,
    search.pay,
    search.priceMax,
    search.sort,
  ])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, pageCount)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const chips: Array<{ label: string; onRemove: () => void }> = [
    ...search.cat.map((slug) => {
      const category = categories.find((c) => c.slug === slug)
      return {
        label: category?.name ?? slug,
        onRemove: () =>
          updateSearch({ cat: search.cat.filter((c) => c !== slug) }),
      }
    }),
    ...(search.date
      ? [
          {
            label: search.date === 'vandaag' ? 'Vandaag' : 'Dit weekend',
            onRemove: () => updateSearch({ date: undefined }),
          },
        ]
      : []),
    ...(search.pay
      ? [
          {
            label: search.pay === 'gratis' ? 'Gratis' : 'Betaald',
            onRemove: () => updateSearch({ pay: undefined }),
          },
        ]
      : []),
    ...(typeof search.priceMax === 'number' && search.priceMax < MAX_PRICE_CENTS
      ? [
          {
            label: `Tot ${formatSrd(search.priceMax)}`,
            onRemove: () => updateSearch({ priceMax: undefined }),
          },
        ]
      : []),
  ]

  function clearAll() {
    navigate({
      search: { q: '', cat: [], sort: 'relevantie', page: 1 },
    })
  }

  return (
    <div className="storefront">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-(--container-content) px-4 py-10 sm:px-6"
      >
        <h1 className="text-4xl font-extrabold tracking-tight">
          Aankomende events
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Ontdek wat er te doen is in Suriname.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside className="h-fit rounded-2xl border">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
              <span className="font-semibold">Filters</span>
              <Button
                variant="link"
                size="sm"
                onClick={clearAll}
                className="h-auto p-0"
              >
                Wis alles
              </Button>
            </div>

            {categories.length > 0 ? (
              <div className="border-b px-5 py-4">
                <div className="font-eyebrow text-xs font-medium text-muted-foreground uppercase">
                  Categorieën
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {categories.map((category) => {
                    const checked = search.cat.includes(category.slug)
                    return (
                      <label
                        key={category.id}
                        className="flex cursor-pointer items-center gap-2.5 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            updateSearch({
                              cat: value
                                ? [...search.cat, category.slug]
                                : search.cat.filter((c) => c !== category.slug),
                            })
                          }
                        />
                        <span className="flex-1">{category.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {category.count}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="border-b px-5 py-4">
              <div className="font-eyebrow text-xs font-medium text-muted-foreground uppercase">
                Datum
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {[
                  { value: undefined, label: 'Elke datum' },
                  { value: 'vandaag' as const, label: 'Vandaag' },
                  { value: 'weekend' as const, label: 'Dit weekend' },
                ].map((option) => (
                  <label
                    key={option.label}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="date"
                      checked={search.date === option.value}
                      onChange={() => updateSearch({ date: option.value })}
                      className="size-4 accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="font-eyebrow text-xs font-medium text-muted-foreground uppercase">
                Prijs
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold">
                <span>{formatSrd(0)}</span>
                <span>{formatSrd(search.priceMax ?? MAX_PRICE_CENTS)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={MAX_PRICE_CENTS}
                step={5000}
                value={search.priceMax ?? MAX_PRICE_CENTS}
                onChange={(e) =>
                  updateSearch({ priceMax: Number(e.target.value) })
                }
                className="mt-2 w-full accent-primary"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant={search.pay === 'gratis' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 rounded-full"
                  onClick={() =>
                    updateSearch({
                      pay: search.pay === 'gratis' ? undefined : 'gratis',
                    })
                  }
                >
                  Gratis
                </Button>
                <Button
                  type="button"
                  variant={search.pay === 'betaald' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 rounded-full"
                  onClick={() =>
                    updateSearch({
                      pay: search.pay === 'betaald' ? undefined : 'betaald',
                    })
                  }
                >
                  Betaald
                </Button>
              </div>
            </div>
          </aside>

          {/* Resultaten */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border bg-card px-5 shadow-sm">
                <Search
                  className="size-4.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Zoek events</span>
                <Input
                  type="text"
                  value={search.q}
                  onChange={(e) => updateSearch({ q: e.target.value })}
                  placeholder="Zoek events op naam of locatie…"
                  className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                />
              </label>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort" className="text-sm text-muted-foreground">
                  Sorteer
                </Label>
                <Select
                  value={search.sort}
                  onValueChange={(value) =>
                    updateSearch({ sort: value as SortOption })
                  }
                >
                  <SelectTrigger id="sort" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevantie">Relevantie</SelectItem>
                    <SelectItem value="datum">Datum — eerst</SelectItem>
                    <SelectItem value="prijs">
                      Prijs — laag naar hoog
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Toont{' '}
                <strong className="text-foreground">{paged.length}</strong> van{' '}
                <strong className="text-foreground">{filtered.length}</strong>{' '}
                events
              </span>
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  {chip.label}
                  <X className="size-3" aria-hidden="true" />
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="mt-10 rounded-xl border border-dashed py-16 text-center">
                <p className="font-medium">Geen events gevonden</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Er zijn geen evenementen die aan je filters voldoen. Pas je
                  filters aan of bekijk alle evenementen.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={clearAll}
                >
                  Wis filters
                </Button>
              </div>
            ) : (
              <>
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {paged.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} />
                    </li>
                  ))}
                </ul>

                {pageCount > 1 ? (
                  <nav
                    className="mt-8 flex flex-wrap items-center justify-center gap-2"
                    aria-label="Paginering"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => updateSearch({ page: page - 1 })}
                    >
                      Vorige
                    </Button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateSearch({ page: p })}
                          aria-current={p === page ? 'page' : undefined}
                          className={cn(
                            'flex size-9 items-center justify-center rounded-md border text-sm font-semibold',
                            p === page
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'hover:bg-accent',
                          )}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount}
                      onClick={() => updateSearch({ page: page + 1 })}
                    >
                      Volgende
                    </Button>
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
