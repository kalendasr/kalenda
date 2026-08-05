import { useRef, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Star,
  Ticket,
} from 'lucide-react'

import { fetchSessionUser } from '#/server/session.ts'
import {
  listPublishedCategories,
  listPublishedEvents,
} from '#/server/public-events.ts'
import {
  formatDateNl,
  isSurinameWeekend,
  surinameWeekday,
  upcomingWeekendRange,
} from '#/lib/datetime.ts'
import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'
import { EventCard } from '#/components/public/event-card.tsx'
import { categoryColor } from '#/components/public/category-colors.ts'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Ingelogde organisatoren horen in de app, niet op de landingspagina.
    const user = await fetchSessionUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async () => ({
    events: await listPublishedEvents(),
    categories: await listPublishedCategories(),
  }),
  head: () => ({
    meta: [{ title: 'Kalenda · Evenementen in Suriname' }],
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
  component: Home,
})

const STEPS = [
  {
    n: '1',
    title: 'Zoek op datum, locatie of categorie',
    body: 'Alles wat in Suriname speelt op één plek — gefilterd tot wat vanavond of dit weekend voor jou relevant is.',
  },
  {
    n: '2',
    title: 'Reken veilig af in SRD',
    body: 'Je ziet de volledige prijs voordat je afrekent. De organisator bevestigt je betaling, geen onzekerheid over je aankoop.',
  },
  {
    n: '3',
    title: 'Toon je ticket bij de ingang',
    body: 'Je QR-code staat in je mail en in je bestelling, ook offline. Elke code is uniek en wordt eenmalig gescand.',
  },
]

const FAQS = [
  {
    q: 'Hoe ontvang ik mijn ticket?',
    a: 'Zodra de organisator je betaling heeft bevestigd, ontvang je je ticket met QR-code per mail. Geen printer nodig — bij de ingang scannen ze je telefoon.',
  },
  {
    q: 'Hoe betaal ik voor mijn tickets?',
    a: 'Je regelt de betaling rechtstreeks met de organisator, via WhatsApp of bankoverschrijving. Zodra zij de betaling bevestigen, staat je ticket klaar.',
  },
  {
    q: 'Wat kost het om zelf een event te plaatsen?',
    a: 'Een event plaatsen op Kalenda is gratis. Je maakt een organisatie aan, zet je event online en beheert je eigen verkoop.',
  },
]

const WEEKEND_DAYS = [
  { label: 'Vrijdag', weekday: 5 },
  { label: 'Zaterdag', weekday: 6 },
  { label: 'Zondag', weekday: 0 },
] as const

function Home() {
  const { events, categories } = Route.useLoaderData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [weekendDay, setWeekendDay] = useState<number>(WEEKEND_DAYS[0].weekday)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  function scrollCategories(dir: 'left' | 'right') {
    categoryScrollRef.current?.scrollBy({
      left: dir === 'right' ? 240 : -240,
      behavior: 'smooth',
    })
  }

  const upcoming = events.slice(0, 6)
  const nextEvent = events.find((e) => e.startsAt) ?? null
  const heroImages = events
    .map((e) => e.coverImage)
    .filter((src): src is string => !!src)
    .slice(0, 2)

  const now = new Date()
  const { sundayEnd } = upcomingWeekendRange(now)
  const shortDateFmt = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'America/Paramaribo',
    day: 'numeric',
    month: 'short',
  })
  const weekendLabel = `${shortDateFmt.format(now).replace('.', '')} — ${shortDateFmt.format(sundayEnd).replace('.', '')}`

  const weekendEvents = events.filter(
    (e) => e.startsAt && isSurinameWeekend(new Date(e.startsAt), now),
  )
  const weekendEventsForDay = weekendEvents.filter(
    (e) => e.startsAt && surinameWeekday(new Date(e.startsAt)) === weekendDay,
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ to: '/evenementen', search: query ? { q: query } : {} })
  }

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-[#F7F9FC] to-background">
          <div className="mx-auto max-w-(--container-content) px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
            {/* Two-column: headline left, images right */}
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                {events.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background py-1.5 pr-3 pl-2 text-xs font-semibold text-foreground/80">
                    <span className="size-1.5 rounded-full bg-success" />
                    {events.length}{' '}
                    {events.length === 1 ? 'evenement' : 'evenementen'} live in
                    Suriname
                  </div>
                ) : null}

                <h1 className="mt-5 max-w-xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
                  Elk evenement in Suriname. Eén ticket, direct op je telefoon.
                </h1>
                <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                  Zoek op datum, locatie of categorie, reken veilig af en
                  ontvang je ticket zodra je betaling is bevestigd.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="rounded-full">
                    <Link to="/evenementen">Evenementen bekijken</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full"
                  >
                    <Link to="/register">Event plaatsen</Link>
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-6">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="size-4 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                    <span className="ml-1 text-sm font-semibold">4,8</span>
                    <span className="text-sm text-muted-foreground">
                      uit 2.140 beoordelingen
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check
                      className="size-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      Veilig betalen
                    </span>
                  </div>
                </div>
              </div>

              {heroImages.length > 0 ? (
                <div className="relative hidden lg:block">
                  <div
                    className={cn(
                      'grid gap-3',
                      heroImages.length > 1
                        ? 'grid-cols-2 [&>*:first-child]:row-span-2'
                        : 'grid-cols-1',
                    )}
                    style={{ height: 420 }}
                  >
                    {heroImages.map((src, i) => (
                      <div
                        key={src + i}
                        className="overflow-hidden rounded-2xl border bg-muted"
                      >
                        <img
                          src={src}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {nextEvent ? (
                    <div className="absolute bottom-4 left-4 flex max-w-[85%] items-center gap-3 rounded-2xl border bg-background p-3.5 shadow-xl">
                      <div className="size-13 shrink-0 rounded-xl bg-muted" />
                      <div className="min-w-0">
                        <div className="font-eyebrow text-[10.5px] font-medium text-primary uppercase">
                          Binnenkort
                        </div>
                        <div className="mt-0.5 truncate text-sm font-bold">
                          {nextEvent.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateNl(nextEvent.startsAt)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Full-width search bar */}
            <form
              onSubmit={handleSearch}
              className="mt-10 flex items-center overflow-hidden rounded-full border bg-[#F3F4F6] shadow-md"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3 px-5 py-4">
                <Search
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Zoek event</div>
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Waar heb je zin in?"
                    className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </label>
              <div className="h-8 w-px shrink-0 bg-border" />
              <label className="hidden flex-1 items-center gap-3 px-5 py-4 sm:flex">
                <MapPin
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Locatie</div>
                  <Input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Paramaribo, Suriname"
                    className="h-auto w-full border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </label>
              <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />
              <div className="hidden flex-1 items-center gap-3 px-5 py-4 lg:flex">
                <CalendarDays
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-xs font-semibold">Datum</div>
                  <div className="text-sm text-muted-foreground">
                    {weekendLabel}
                  </div>
                </div>
              </div>
              <div className="p-2">
                <Button type="submit" size="lg" className="rounded-full">
                  Zoeken
                </Button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 pb-10">
              <span className="text-sm text-muted-foreground">Snel:</span>
              {['Vandaag', 'Dit weekend', 'Gratis', 'Muziek', 'Nightlife'].map(
                (label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/evenementen',
                        search: { q: label.toLowerCase() },
                      })
                    }
                    className="rounded-full border bg-background px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Categorieën */}
        {categories.length > 0 ? (
          <section className="mx-auto max-w-(--container-content) px-4 py-16 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Waar heb je vanavond zin in?
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {categories.length}{' '}
                  {categories.length === 1 ? 'categorie' : 'categorieën'}, één
                  tik naar wat er speelt.
                </p>
              </div>
              <Link
                to="/evenementen"
                className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
              >
                Alle categorieën <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-accent"
                aria-label="Vorige categorieën"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div
                ref={categoryScrollRef}
                className="flex min-w-0 flex-1 [scrollbar-width:none] gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
              >
                {categories.map((category, i) => {
                  const color = categoryColor(i)
                  return (
                    <Link
                      key={category.id}
                      to="/evenementen"
                      search={{ cat: [category.slug] }}
                      className="flex w-52 shrink-0 flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md"
                    >
                      <span
                        className="flex size-12 items-center justify-center rounded-2xl"
                        style={{ background: color.tint }}
                      >
                        <span
                          className={cn(
                            'size-5',
                            i % 2 === 0 ? 'rounded-full' : 'rounded-[4px]',
                          )}
                          style={{ background: color.dot }}
                        />
                      </span>
                      <div className="mt-4 font-bold">{category.name}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {category.count}{' '}
                        {category.count === 1 ? 'event' : 'events'}
                      </div>
                    </Link>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-accent"
                aria-label="Volgende categorieën"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </section>
        ) : null}

        {/* Dit weekend */}
        {weekendEvents.length > 0 ? (
          <section className="mx-auto max-w-(--container-content) px-4 py-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl border">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-[#FBFCFE] px-5 py-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Dit weekend in Suriname
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {weekendEvents.length}{' '}
                    {weekendEvents.length === 1 ? 'evenement' : 'evenementen'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {WEEKEND_DAYS.map((day) => (
                    <button
                      key={day.label}
                      type="button"
                      onClick={() => setWeekendDay(day.weekday)}
                      className={cn(
                        'min-h-9 rounded-lg border px-3.5 text-sm font-semibold transition-colors',
                        weekendDay === day.weekday
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background text-foreground/70 hover:bg-accent',
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {weekendEventsForDay.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Geen evenementen op deze dag.
                </p>
              ) : (
                weekendEventsForDay.map((event) => (
                  <Link
                    key={event.id}
                    to="/evenementen/$slug"
                    params={{ slug: event.slug }}
                    className="flex flex-wrap items-center gap-4 border-b px-5 py-4 last:border-b-0 hover:bg-[#FBFCFE]"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-eyebrow text-[11px] font-medium text-primary uppercase">
                        {formatDateNl(event.startsAt)}
                      </div>
                      <div className="mt-0.5 truncate text-base font-bold">
                        {event.title}
                      </div>
                      {event.venue ? (
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {event.venue.name}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-sm font-bold">
                      {event.isFree
                        ? 'Gratis'
                        : event.priceFromCents !== null
                          ? `Vanaf SRD ${(event.priceFromCents / 100).toLocaleString('nl-NL')}`
                          : ''}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}

        {/* Aankomende events */}
        <section className="mx-auto max-w-(--container-content) px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Binnenkort in Suriname
              </h2>
              <p className="mt-2 text-muted-foreground">
                De eerstvolgende gepubliceerde evenementen.
              </p>
            </div>
            <Link
              to="/evenementen"
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
            >
              Alle evenementen <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed py-16 text-center">
              <p className="font-medium">Nog geen evenementen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Er zijn op dit moment geen gepubliceerde evenementen. Kom snel
                terug.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Hoe werkt het */}
        <section className="border-y bg-[#F7F9FC]">
          <div className="mx-auto max-w-(--container-content) px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Van zoeken naar ticket in drie stappen
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="rounded-xl border bg-card p-6 shadow-sm"
                >
                  <div className="flex size-9 items-center justify-center rounded-[10px] bg-foreground text-sm font-bold text-background">
                    {step.n}
                  </div>
                  <div className="mt-4 font-semibold">{step.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voor organisatoren */}
        <section className="mx-auto max-w-(--container-content) px-4 py-16 sm:px-6">
          <div className="grid gap-10 rounded-2xl bg-foreground p-8 text-background sm:p-14 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="font-eyebrow text-xs font-medium text-background/60 uppercase">
                Voor organisatoren
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Zet je event online en verkoop je eerste ticket.
              </h2>
              <p className="mt-3 max-w-md text-background/70">
                Deel één link, volg je verkoop live en beheer je check-ins op de
                dag zelf.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full"
                >
                  <Link to="/register">Gratis beginnen</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-background/15 bg-background/5 p-5">
                <div className="text-2xl font-bold">0 SRD</div>
                <div className="mt-1 text-sm text-background/60">
                  Kosten om te plaatsen
                </div>
              </div>
              <div className="rounded-xl border border-background/15 bg-background/5 p-5">
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <Ticket className="size-5" /> Live
                </div>
                <div className="mt-1 text-sm text-background/60">
                  Verkoop- en scangegevens
                </div>
              </div>
              <div className="rounded-xl border border-background/15 bg-background/5 p-5">
                <MapPin className="size-5" />
                <div className="mt-2 text-sm text-background/60">
                  Eén event per venue, meteen op de kaart
                </div>
              </div>
              <div className="rounded-xl border border-background/15 bg-background/5 p-5">
                <CalendarDays className="size-5" />
                <div className="mt-2 text-sm text-background/60">
                  Van aanmaken tot publiceren in minuten
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Veelgestelde vragen
          </h2>
          <Accordion
            type="single"
            collapsible
            className="mt-6 rounded-xl border px-4"
          >
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
