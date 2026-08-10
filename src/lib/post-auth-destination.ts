/** Waar een gebruiker na in-/uitloggen hoort. Intentie wint van rol. */
export function postAuthDestination(opts: {
  redirectTo: string | null
  hasOrganization: boolean
}): string {
  if (opts.redirectTo) return opts.redirectTo
  return opts.hasOrganization ? '/dashboard' : '/evenementen'
}
