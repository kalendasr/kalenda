import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CalendarDays,
  Globe,
  Heart,
  Mail,
  MapPin,
  Phone,
  Share2,
  Ticket,
} from 'lucide-react'

import { getPublishedEventBySlug } from '#/server/public-events.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { formatMoney } from '#/lib/money.ts'
import { useCurrency } from '#/lib/currency.ts'
import { cn } from '#/lib/utils.ts'
import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Markdown } from '#/components/ui/markdown.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'
import { TicketSelector } from '#/components/public/ticket-selector.tsx'

export const Route = createFileRoute('/evenementen/$slug')({
  loader: async ({ params }) => ({
    event: await getPublishedEventBySlug({ data: { slug: params.slug } }),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.event
          ? `${loaderData.event.title} · Kalenda`
          : 'Evenement niet gevonden · Kalenda',
      },
    ],
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
  component: PublicEventDetail,
})

/**
 * `EventContent` heeft geen apart tijdveld (zie CLAUDE.md §4 — geen migratie
 * voor deze redesign). Organisatoren typen agendapunten vrij; als een titel
 * met "23:00" begint, tonen we die als tijdkolom. Staat er geen tijd, dan
 * schuift de titel gewoon door zonder lege kolom te veinzen.
 */
const AGENDA_TIME = /^(\d{1,2}[:.]\d{2})\s*[-–—·]?\s*(.+)$/
function splitAgendaTitle(title: string): {
  time: string | null
  label: string
} {
  const match = AGENDA_TIME.exec(title)
  return match
    ? { time: match[1] ?? null, label: match[2] ?? '' }
    : { time: null, label: title }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function PublicEventDetail() {
  const { event } = Route.useLoaderData()
  const { currency } = useCurrency()
  const [saved, setSaved] = React.useState(false)
  const [shared, setShared] = React.useState(false)

  if (!event) {
    return (
      <div className="storefront">
        <PublicHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-(--container-content) px-4 py-20 text-center sm:px-6"
        >
          <h1 className="text-2xl font-semibold">Evenement niet gevonden</h1>
          <p className="mt-2 text-muted-foreground">
            Dit evenement bestaat niet (meer) of is niet gepubliceerd.
          </p>
          <Link
            to="/evenementen"
            className="mt-6 inline-block font-medium text-primary hover:underline"
          >
            Bekijk alle evenementen
          </Link>
        </main>
        <PublicFooter />
      </div>
    )
  }

  const eventTitle = event.title

  async function handleShare() {
    const url = window.location.href
    try {
      await navigator.share({ title: eventTitle, url })
    } catch (error) {
      // AbortError = gebruiker annuleerde het deelvenster, geen fout tonen.
      // Elke andere fout (o.a. geen native deelvenster) valt terug op de klembordkopie.
      if (error instanceof Error && error.name === 'AbortError') return
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    }
  }

  const org = event.organization
  const socials = [
    { label: 'Website', href: org.website, icon: Globe },
    { label: 'Facebook', href: org.facebook, icon: Globe },
    { label: 'Instagram', href: org.instagram, icon: Globe },
  ].filter((s) => s.href)

  const agenda = event.content.filter((item) => item.type === 'Agenda')
  const speakers = event.content.filter((item) => item.type === 'Speaker')
  const rules = event.content.filter((item) => item.type === 'Rules')
  const faqs = event.content.filter((item) => item.type === 'Faq')

  const hasTickets = event.ticketTypes.length > 0
  const mapsQuery = event.venue
    ? encodeURIComponent(
        [event.venue.name, event.venue.address, event.venue.district]
          .filter(Boolean)
          .join(', '),
      )
    : ''

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main" className="pb-24 lg:pb-16">
        <div className="mx-auto w-full max-w-(--container-content) px-4 pt-5 sm:px-6">
          {/* Broodkruimel */}
          <nav className="flex items-center gap-2 text-[13.5px] font-semibold text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link to="/evenementen" className="hover:text-foreground">
              Evenementen
            </Link>
            <span>/</span>
            <span className="truncate text-foreground">{event.title}</span>
          </nav>

          {/* Hero */}
          <div className="relative mt-4 aspect-[16/7] w-full overflow-hidden rounded-[22px] border bg-muted">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <CalendarDays className="size-12" />
              </div>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
              {event.category ? (
                <Badge className="rounded-md bg-foreground/85 px-3 py-1.5 text-xs font-bold text-background backdrop-blur">
                  {event.category.name}
                </Badge>
              ) : null}
              {event.availability.almostSoldOut ? (
                <span className="rounded-md bg-warning px-3 py-1.5 text-xs font-bold text-warning-foreground">
                  Bijna uitverkocht
                </span>
              ) : null}
            </div>

            <div className="absolute top-3.5 right-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => setSaved((v) => !v)}
                aria-label={
                  saved ? 'Verwijder uit bewaard' : 'Bewaar evenement'
                }
                aria-pressed={saved}
                className="flex h-10 items-center gap-2 rounded-full border bg-background/95 px-3.5 shadow-sm backdrop-blur hover:border-foreground/30"
              >
                <Heart
                  className={cn(
                    'size-4',
                    saved
                      ? 'fill-destructive text-destructive'
                      : 'text-foreground',
                  )}
                />
                <span className="text-[13.5px] font-bold">
                  {saved ? 'Bewaard' : 'Bewaren'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex h-10 items-center gap-2 rounded-full border bg-background/95 px-3.5 shadow-sm backdrop-blur hover:border-foreground/30"
              >
                <Share2 className="size-4 text-foreground" />
                <span className="text-[13.5px] font-bold">
                  {shared ? 'Link gekopieerd' : 'Delen'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-(--container-content) gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Hoofdinhoud */}
          <div className="flex min-w-0 flex-col gap-9">
            <div>
              <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-[42px]">
                {event.title}
              </h1>
              {event.shortDescription ? (
                <p className="mt-3 max-w-xl text-lg text-pretty text-muted-foreground">
                  {event.shortDescription}
                </p>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {event.startsAt ? (
                  <div className="flex gap-3 rounded-[14px] border bg-card p-4">
                    <CalendarDays className="mt-0.5 size-[18px] shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="font-eyebrow text-[10.5px] text-muted-foreground uppercase">
                        Wanneer
                      </div>
                      <div className="mt-1.5 text-[14.5px] font-bold">
                        {formatDateTimeNl(event.startsAt)}
                      </div>
                      {event.endsAt ? (
                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                          tot {formatDateTimeNl(event.endsAt)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {event.venue ? (
                  <div className="flex gap-3 rounded-[14px] border bg-card p-4">
                    <MapPin className="mt-0.5 size-[18px] shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="font-eyebrow text-[10.5px] text-muted-foreground uppercase">
                        Waar
                      </div>
                      <div className="mt-1.5 truncate text-[14.5px] font-bold">
                        {event.venue.name}
                      </div>
                      <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {[event.venue.address, event.venue.district]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-[14px] border bg-card p-4">
                  <Ticket className="mt-0.5 size-[18px] shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="font-eyebrow text-[10.5px] text-muted-foreground uppercase">
                      Tickets vanaf
                    </div>
                    <div className="mt-1.5 text-[14.5px] font-bold">
                      {event.availability.isFree
                        ? 'Gratis'
                        : event.availability.priceFromCents !== null
                          ? formatMoney(
                              event.availability.priceFromCents,
                              currency,
                            )
                          : 'Binnenkort'}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      {hasTickets
                        ? `nog ${event.availability.remaining} van ${event.availability.capacity} beschikbaar`
                        : 'ticketverkoop start binnenkort'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {event.description ? (
              <section>
                <h2 className="mb-3 text-[22px] font-extrabold tracking-tight">
                  Over dit event
                </h2>
                <div className="max-w-[68ch] text-[16px] leading-relaxed text-foreground/80">
                  <Markdown>{event.description}</Markdown>
                </div>
              </section>
            ) : null}

            {agenda.length > 0 ? (
              <section>
                <h2 className="mb-3.5 text-[22px] font-extrabold tracking-tight">
                  Programma
                </h2>
                <div className="overflow-hidden rounded-[18px] border bg-card">
                  {agenda.map((item, i) => {
                    const { time, label } = splitAgendaTitle(item.title)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'grid grid-cols-[64px_1fr] gap-4 px-5 py-4 sm:grid-cols-[92px_1fr]',
                          i > 0 && 'border-t',
                        )}
                      >
                        <div className="font-eyebrow pt-0.5 text-[13px] text-primary">
                          {time}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[15.5px] font-bold tracking-tight">
                            {label}
                          </div>
                          {item.content ? (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {item.content}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {speakers.length > 0 ? (
              <section>
                <h2 className="mb-3.5 text-[22px] font-extrabold tracking-tight">
                  Line-up
                </h2>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {speakers.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 rounded-2xl border bg-card p-3.5"
                    >
                      <Avatar className="size-[46px]">
                        <AvatarFallback className="bg-foreground text-[14px] font-extrabold text-background">
                          {initials(item.title)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold tracking-tight">
                          {item.title}
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px] text-muted-foreground">
                          {item.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {event.venue ? (
              <section>
                <h2 className="mb-3.5 text-[22px] font-extrabold tracking-tight">
                  Locatie
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border bg-card p-5">
                  <div>
                    <div className="text-[15.5px] font-bold">
                      {event.venue.name}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {[
                        event.venue.address,
                        event.venue.district,
                        event.venue.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center rounded-[11px] bg-muted px-4 text-sm font-bold hover:bg-primary hover:text-primary-foreground"
                  >
                    Route
                  </a>
                </div>
              </section>
            ) : null}

            {rules.length > 0 ? (
              <section>
                <h2 className="mb-3.5 text-[22px] font-extrabold tracking-tight">
                  Huisregels
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {rules.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[14px] border bg-muted/40 p-4"
                    >
                      <div className="text-[14.5px] font-bold">
                        {item.title}
                      </div>
                      <Markdown className="mt-1 text-[13.5px] text-muted-foreground">
                        {item.content}
                      </Markdown>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {faqs.length > 0 ? (
              <section>
                <h2 className="mb-3.5 text-[22px] font-extrabold tracking-tight">
                  Veelgestelde vragen
                </h2>
                <Accordion
                  type="single"
                  collapsible
                  className="rounded-[18px] border bg-card px-5"
                >
                  {faqs.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-[15.5px] font-bold">
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <Markdown className="text-[14.5px] text-muted-foreground">
                          {item.content}
                        </Markdown>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ) : null}
          </div>

          {/* Zijbalk */}
          <aside
            id="tickets"
            className="flex flex-col gap-4 lg:sticky lg:top-[88px] lg:self-start"
          >
            {hasTickets ? (
              <TicketSelector
                slug={event.slug}
                ticketTypes={event.ticketTypes}
              />
            ) : (
              <div className="rounded-[20px] border border-dashed p-5 text-center">
                <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Ticket className="size-4" /> Ticketverkoop start binnenkort
                </p>
              </div>
            )}

            <div className="rounded-[20px] border bg-card p-5">
              <div className="font-eyebrow text-[10.5px] text-muted-foreground uppercase">
                Georganiseerd door
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="size-11 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary/10 text-[14px] font-extrabold text-primary">
                    {initials(org.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[15.5px] font-bold">{org.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    {org.eventCount} {org.eventCount === 1 ? 'event' : 'events'}
                  </div>
                </div>
              </div>
              <div className="mt-3.5 flex flex-col gap-1">
                {org.email ? (
                  <a
                    href={`mailto:${org.email}`}
                    className="flex items-center gap-2 py-1.5 text-sm text-foreground/80 hover:text-primary"
                  >
                    <Mail className="size-[15px] shrink-0" /> {org.email}
                  </a>
                ) : null}
                {org.phone ? (
                  <a
                    href={`tel:${org.phone}`}
                    className="flex items-center gap-2 py-1.5 text-sm text-foreground/80 hover:text-primary"
                  >
                    <Phone className="size-[15px] shrink-0" /> {org.phone}
                  </a>
                ) : null}
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 py-1.5 text-sm text-foreground/80 hover:text-primary"
                  >
                    <social.icon className="size-[15px] shrink-0" />{' '}
                    {social.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />

      {hasTickets ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <div className="font-eyebrow text-[10px] text-muted-foreground uppercase">
              Vanaf
            </div>
            <div className="text-[15px] font-extrabold">
              {event.availability.isFree
                ? 'Gratis'
                : event.availability.priceFromCents !== null
                  ? formatMoney(event.availability.priceFromCents, currency)
                  : ''}
            </div>
          </div>
          <a
            href="#tickets"
            className="flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Bekijk tickets
          </a>
        </div>
      ) : null}
    </div>
  )
}
