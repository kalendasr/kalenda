import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { getSession } from '#/lib/session.server.ts'

/**
 * Eén server-round-trip voor de sessiecontext: de ingelogde gebruiker én zijn
 * organisatie (inclusief betaalinstellingen). Wordt geladen in de
 * `beforeLoad` van `__root.tsx` en hangt daardoor in de routecontext van elke
 * pagina — de `_app`-layout, de storefront-header en het organisatietraject
 * lezen hem uit de context in plaats van zelf opnieuw op te vragen.
 *
 * Retourneert `user: null` wanneer er geen sessie is; het doorsturen naar de
 * inlogpagina gebeurt in de route (`beforeLoad`).
 */
export const loadAppContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession()

    if (!session?.user) {
      return { user: null, organization: null } as const
    }

    const { id, name, email, image } = session.user
    // additionalFields: better-auth geeft ze mee via de server-config, maar
    // het type van getSession() kent ze niet automatisch — vandaar de cast.
    const u = session.user as typeof session.user & {
      firstName: string
      lastName: string
    }

    const organization = await db.organization.findFirst({
      where: { ownerId: id, deletedAt: null },
      include: { paymentSettings: true },
    })

    return {
      user: {
        id,
        name,
        email,
        image: image ?? null,
        firstName: u.firstName,
        lastName: u.lastName,
      },
      organization,
    }
  },
)

export type AppOrganization = Awaited<
  ReturnType<typeof loadAppContext>
>['organization']
