import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { getActiveUser } from '#/lib/session.server.ts'

/**
 * Eén server-round-trip voor de sessiecontext: de ingelogde gebruiker én zijn
 * organisatie (inclusief betaalinstellingen). Wordt geladen in de
 * `beforeLoad` van `__root.tsx` en hangt daardoor in de routecontext van elke
 * pagina — de `_app`-layout, de storefront-header en het organisatietraject
 * lezen hem uit de context in plaats van zelf opnieuw op te vragen.
 *
 * Retourneert `user: null` wanneer er geen sessie is (of de gebruiker
 * geblokkeerd is); het doorsturen naar de inlogpagina gebeurt in de route
 * (`beforeLoad`). Een platformbeheerder heeft nooit een eigen organisatie.
 */
export const loadAppContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getActiveUser()

    if (!user) {
      return { user: null, organization: null } as const
    }

    const organization = await db.organization.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      include: { paymentSettings: true },
    })

    return { user, organization }
  },
)

export type AppOrganization = Awaited<
  ReturnType<typeof loadAppContext>
>['organization']
