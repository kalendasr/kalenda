import { Link } from '@tanstack/react-router'

const FOOTER_COLUMNS = [
  {
    title: 'Ontdekken',
    links: [
      {
        label: 'Alle evenementen',
        to: '/evenementen' as const,
        search: undefined,
      },
      {
        label: 'Dit weekend',
        to: '/evenementen' as const,
        search: { date: 'weekend' as const },
      },
      {
        label: 'Gratis evenementen',
        to: '/evenementen' as const,
        search: { pay: 'gratis' as const },
      },
      {
        label: 'Mijn tickets',
        to: '/mijn-tickets' as const,
        search: undefined,
      },
    ],
  },
  {
    title: 'Organisatoren',
    links: [
      {
        label: 'Event plaatsen',
        to: '/organisator' as const,
        search: undefined,
      },
      { label: 'Inloggen', to: '/login' as const, search: undefined },
    ],
  },
]

/** Footer voor de publieke storefront, gedeeld door homepage en zoekpagina. */
export function PublicFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid max-w-(--container-content) gap-9 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="text-xl font-bold">
            Kalenda<span className="text-primary">.</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-background/70">
            Het platform voor evenementen in Suriname. Ontdek wat er speelt,
            koop veilig je ticket en organiseer je eigen event.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <div className="text-sm font-semibold">{column.title}</div>
            <div className="mt-3 flex flex-col gap-1">
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  search={link.search}
                  className="py-1 text-sm text-background/70 hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-(--container-content) flex-wrap justify-between gap-3 border-t border-background/10 px-4 py-5 text-xs text-background/60 sm:px-6">
        <span>
          © {new Date().getFullYear()} Kalenda. Alle rechten voorbehouden.
        </span>
        <span>Paramaribo, Suriname</span>
      </div>
    </footer>
  )
}
