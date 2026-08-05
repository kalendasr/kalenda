import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'

import { toast } from '#/components/ui/sonner.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

/**
 * Instellingen-tab: verificatie, team en accountbeheer. Nieuw t.o.v. de vorige
 * IA — verificatie en team-uitnodigen zijn hier bewust nog UI-only; het
 * datamodel voor verificatiedocumenten en teamrollen komt in een
 * vervolgronde (CLAUDE.md §4: Team is V1).
 */
export const Route = createFileRoute('/_app/organization/settings')({
  component: OrganizationSettings,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationSettings() {
  const { user, organization } = workspaceRoute.useRouteContext()

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verificatie</CardTitle>
        </CardHeader>
        <CardContent>
          {organization.isVerified ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <span className="block font-semibold">Geverifieerd</span>
              <span className="mt-0.5 block text-muted-foreground">
                Je organisatie is geverifieerd.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Niet geverifieerd
                </span>
                <span className="block text-sm text-muted-foreground">
                  Upload een KKF-uittreksel en een ID. Beoordeling binnen 2
                  werkdagen.
                </span>
              </span>
              <Button
                size="sm"
                onClick={() =>
                  toast.info(
                    'Documenten uploaden komt beschikbaar in een vervolgronde.',
                  )
                }
              >
                Documenten uploaden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex-row items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <CardTitle className="text-base">Team</CardTitle>
            <CardDescription>
              Wie er bij je organisatie mag werken.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info('Teamleden uitnodigen volgt in een vervolgronde.')
            }
          >
            <UserPlus /> Uitnodigen
          </Button>
        </CardHeader>
        <CardContent className="border-t px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{user.name}</span>
              <span className="block text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Eigenaar
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Organisatie verwijderen
          </CardTitle>
          <CardDescription>
            Alle evenementen, orders en rapportages worden definitief
            verwijderd. Dit kan niet ongedaan worden gemaakt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              toast.info(
                'Neem contact op met support om je organisatie te laten verwijderen.',
              )
            }
          >
            Verwijderen aanvragen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
