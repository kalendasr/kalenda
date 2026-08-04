import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CalendarDays,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Ticket,
} from 'lucide-react'

import { getPublishedEventBySlug } from '#/server/public-events.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Markdown } from '#/components/ui/markdown.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
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
  }),
  component: PublicEventDetail,
})

const CONTENT_SECTIONS = [
  { type: 'Agenda', title: 'Programma' },
  { type: 'Speaker', title: 'Sprekers' },
  { type: 'Faq', title: 'Veelgestelde vragen' },
  { type: 'Rules', title: 'Huisregels' },
] as const

function PublicEventDetail() {
  const { event } = Route.useLoaderData()

  if (!event) {
    return (
      <>
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
      </>
    )
  }

  const org = event.organization
  const socials = [
    { label: 'Website', href: event.organization.website, icon: Globe },
    { label: 'Facebook', href: event.organization.facebook, icon: Globe },
    { label: 'Instagram', href: event.organization.instagram, icon: Globe },
  ].filter((s) => s.href)

  return (
    <>
      <PublicHeader />
      <main id="main" className="pb-16">
        {/* Hero */}
        <div className="aspect-[21/9] max-h-[420px] w-full overflow-hidden bg-muted">
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
        </div>

        <div className="mx-auto grid w-full max-w-(--container-content) gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
          {/* Hoofdinhoud */}
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
              {event.category ? (
                <Badge variant="secondary" className="w-fit">
                  {event.category.name}
                </Badge>
              ) : null}
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {event.title}
              </h1>
              {event.shortDescription ? (
                <p className="text-lg text-muted-foreground">
                  {event.shortDescription}
                </p>
              ) : null}
            </header>

            {event.description ? (
              <section className="text-base leading-relaxed">
                <Markdown>{event.description}</Markdown>
              </section>
            ) : null}

            {CONTENT_SECTIONS.map((section) => {
              const items = event.content.filter(
                (item) => item.type === section.type,
              )
              if (items.length === 0) return null

              if (section.type === 'Faq') {
                return (
                  <section key={section.type} className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    <Accordion
                      type="single"
                      collapsible
                      className="rounded-xl border px-4"
                    >
                      {items.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger>{item.title}</AccordionTrigger>
                          <AccordionContent>
                            <Markdown className="text-muted-foreground">
                              {item.content}
                            </Markdown>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                )
              }

              return (
                <section key={section.type} className="flex flex-col gap-3">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <ul className="flex flex-col divide-y rounded-xl border">
                    {items.map((item) => (
                      <li key={item.id} className="flex flex-col gap-1 p-4">
                        <p className="font-medium">{item.title}</p>
                        <Markdown className="text-sm text-muted-foreground">
                          {item.content}
                        </Markdown>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>

          {/* Zijbalk */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                {event.startsAt ? (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Wanneer</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTimeNl(event.startsAt)}
                      </p>
                      {event.endsAt ? (
                        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="size-3.5" /> tot{' '}
                          {formatDateTimeNl(event.endsAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {event.venue ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Waar</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue.name}
                        {event.venue.address ? (
                          <>
                            <br />
                            {event.venue.address}
                          </>
                        ) : null}
                        {event.venue.district ? (
                          <>
                            <br />
                            {event.venue.district}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ) : null}

                {event.ticketTypes.length > 0 ? (
                  <TicketSelector
                    slug={event.slug}
                    ticketTypes={event.ticketTypes}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-center">
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Ticket className="size-4" /> Ticketverkoop start
                      binnenkort
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2 pt-6">
                <p className="text-sm font-medium">Georganiseerd door</p>
                <p className="text-sm text-muted-foreground">{org.name}</p>
                <div className="mt-1 flex flex-col gap-1.5 text-sm">
                  {org.email ? (
                    <a
                      href={`mailto:${org.email}`}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="size-3.5" /> {org.email}
                    </a>
                  ) : null}
                  {org.phone ? (
                    <a
                      href={`tel:${org.phone}`}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" /> {org.phone}
                    </a>
                  ) : null}
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <social.icon className="size-3.5" /> {social.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </>
  )
}
