/** Waar een gebruiker na in-/uitloggen hoort. Intentie wint van rol. */
export function postAuthDestination(opts: {
  redirectTo: string | null
  hasOrganization: boolean
  isPlatformAdmin?: boolean
}): string {
  if (opts.redirectTo) return opts.redirectTo
  if (opts.isPlatformAdmin) return '/admin'
  return opts.hasOrganization ? '/dashboard' : '/evenementen'
}
