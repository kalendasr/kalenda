import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarDays, Heart, MapPin } from 'lucide-react'

import { formatDateNl } from '#/lib/datetime.ts'
import { formatMoney } from '#/lib/money.ts'
import { useCurrency } from '#/lib/currency.ts'
import { cn } from '#/lib/utils.ts'

export type PublicEventCardData = {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  coverImage: string | null
  startsAt: Date | string | null
  priceFromCents: number | null
  isFree: boolean
  almostSoldOut: boolean
  category: { name: string; slug: string } | null
  venue: { name: string; district: string | null } | null
}

/**
 * Kaart voor een gepubliceerd event, gedeeld door de homepage en de
 * zoekpagina — één plek voor hoe een event zich presenteert.
 *
 * De hele kaart is klikbaar via een onzichtbare full-bleed link (in plaats
 * van de zichtbare inhoud zelf in een <a> te wrappen), zodat het
 * favoriet-hartje er als een normale <button> naast kan bestaan zonder
 * ongeldige geneste interactieve elementen.
 */
export function EventCard({ event }: { event: PublicEventCardData }) {
  const { currency } = useCurrency()
  const [saved, setSaved] = useState(false)
  const startsAt = event.startsAt ? new Date(event.startsAt) : null

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/evenementen/$slug"
        params={{ slug: event.slug }}
        className="absolute inset-0 z-0"
        aria-label={event.title}
      />

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <CalendarDays className="size-8" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {event.isFree ? (
              <span className="rounded-md bg-success px-2.5 py-1 text-xs font-bold text-success-foreground">
                Gratis
              </span>
            ) : event.almostSoldOut ? (
              <span className="rounded-md bg-warning px-2.5 py-1 text-xs font-bold text-warning-foreground">
                Bijna uitverkocht
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setSaved((v) => !v)
            }}
            aria-label={saved ? 'Verwijder uit bewaard' : 'Bewaar evenement'}
            aria-pressed={saved}
            className="pointer-events-auto z-10 flex size-9 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition-colors hover:border-foreground/30"
          >
            <Heart
              className={cn(
                'size-4',
                saved ? 'fill-destructive text-destructive' : 'text-foreground',
              )}
            />
          </button>
        </div>

        {!event.isFree && event.priceFromCents !== null ? (
          <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-foreground/85 px-2.5 py-1 text-xs font-bold text-background">
            Vanaf {formatMoney(event.priceFromCents, currency)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {startsAt ? (
            <span className="font-eyebrow text-xs font-medium text-primary uppercase">
              {formatDateNl(startsAt)}
            </span>
          ) : null}
          {event.category ? (
            <span className="text-xs font-semibold text-muted-foreground">
              {event.category.name}
            </span>
          ) : null}
        </div>
        <h3 className="font-semibold tracking-tight">{event.title}</h3>
        {event.shortDescription ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.shortDescription}
          </p>
        ) : null}
        {event.venue ? (
          <div className="mt-auto flex items-center gap-1.5 pt-2 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {[event.venue.name, event.venue.district]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  )
}
