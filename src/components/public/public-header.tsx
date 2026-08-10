import {
  Link,
  useNavigate,
  useRouteContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { CalendarDays, LogIn, LogOut, Ticket } from 'lucide-react'

import { signOut } from '#/lib/auth-client.ts'
import { useCurrency } from '#/lib/currency.ts'
import { cn } from '#/lib/utils.ts'
import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'

const NAV_LINKS = [
  { label: 'Evenementen', to: '/evenementen' as const, search: undefined },
  {
    label: 'Dit weekend',
    to: '/evenementen' as const,
    search: { date: 'weekend' as const },
  },
  { label: 'Mijn tickets', to: '/mijn-tickets' as const, search: undefined },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function AccountMenu({
  user,
  hasOrganization,
}: {
  user: { name: string; email: string }
  hasOrganization: boolean
}) {
  const navigate = useNavigate()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    await router.invalidate()
    await navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Accountmenu"
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/mijn-tickets">
            <Ticket /> Mijn tickets
          </Link>
        </DropdownMenuItem>
        {hasOrganization ? (
          <DropdownMenuItem asChild>
            <Link to="/dashboard">
              <CalendarDays /> Dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut /> Uitloggen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Header voor de publieke storefront. Sessiebewust: toont "Inloggen" +
 * "Event plaatsen" voor bezoekers, en een accountmenu zodra iemand is
 * ingelogd. Gedeeld door homepage, zoekpagina en het organisatortraject zodat
 * navigatie overal hetzelfde gedrag heeft.
 */
export function PublicHeader() {
  const { currency, setCurrency } = useCurrency()
  const location = useRouterState({ select: (s) => s.location })
  const { user, organization } = useRouteContext({ from: '__root__' })

  function isActive(link: (typeof NAV_LINKS)[number]) {
    if (location.pathname !== link.to) return false
    return link.to === '/evenementen'
      ? (location.search as { date?: string }).date === link.search?.date
      : true
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-(--container-content) items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <CalendarDays className="size-5 text-primary" aria-hidden="true" />
          Kalenda<span className="text-primary">.</span>
        </Link>
        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="Publiek menu"
        >
          {NAV_LINKS.map((link) => (
            <Button
              key={link.label}
              asChild
              variant="ghost"
              size="sm"
              className={cn(isActive(link) && 'bg-accent')}
            >
              <Link to={link.to} search={link.search}>
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div
            className="hidden gap-0.5 rounded-md bg-muted p-0.5 sm:flex"
            role="group"
            aria-label="Weergavevaluta"
          >
            <button
              type="button"
              onClick={() => setCurrency('SRD')}
              aria-pressed={currency === 'SRD'}
              className={cn(
                'min-h-8 rounded-sm px-2.5 text-xs font-semibold transition-colors',
                currency === 'SRD'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              SRD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('EUR')}
              aria-pressed={currency === 'EUR'}
              className={cn(
                'min-h-8 rounded-sm px-2.5 text-xs font-semibold transition-colors',
                currency === 'EUR'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              EUR
            </button>
          </div>

          {!user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full sm:hidden"
              >
                <Link to="/login" search={{ redirect: undefined }}>
                  <LogIn aria-hidden="true" />
                  <span className="sr-only">Inloggen</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link to="/login" search={{ redirect: undefined }}>
                  Inloggen
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/organisator">Event plaatsen</Link>
              </Button>
            </>
          ) : (
            <>
              {organization ? (
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <Link to="/organisator">Event plaatsen</Link>
                </Button>
              )}
              <AccountMenu
                user={user}
                hasOrganization={Boolean(organization)}
              />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
