import * as React from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Building2, CalendarDays, LayoutDashboard, LogOut } from 'lucide-react'

import { signOut } from '#/lib/auth-client.ts'
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

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: Array<NavItem> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/organization', label: 'Organisatie', icon: Building2 },
]

type ShellUser = { name: string; email: string }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      activeProps={{
        className: cn('bg-accent text-accent-foreground'),
        'aria-current': 'page',
      }}
      activeOptions={{ exact: item.to === '/dashboard' }}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  )
}

function UserMenu({ user }: { user: ShellUser }) {
  const navigate = useNavigate()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    await router.invalidate()
    await navigate({ to: '/login' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Accountmenu"
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </span>
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
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut />
          Uitloggen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <CalendarDays className="size-5 text-primary" aria-hidden="true" />
      Kalenda
    </span>
  )
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop-sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center px-6">
          <Wordmark />
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 px-3 py-2"
          aria-label="Hoofdmenu"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t p-3">
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Mobiele header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <UserMenu user={user} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? 'Menu sluiten' : 'Menu openen'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-foreground" />
              <span className="block h-0.5 w-4 bg-foreground" />
              <span className="block h-0.5 w-4 bg-foreground" />
            </span>
          </Button>
        </div>
      </header>

      {mobileOpen ? (
        <nav
          className="border-b bg-background px-3 py-2 md:hidden"
          aria-label="Hoofdmenu"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      ) : null}

      <div className="flex-1">
        <main
          id="main"
          className="mx-auto w-full max-w-(--container-content) px-4 py-6 sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
