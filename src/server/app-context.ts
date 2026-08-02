import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { getSession } from '#/lib/session.server.ts'

/**
 * Eén server-round-trip voor de app-shell: de ingelogde gebruiker én zijn
 * organisatie (inclusief betaalinstellingen). Gebruikt door de `_app`-layout
 * voor de auth- en onboarding-guards, en door de organisatieschermen.
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

    const organization = await db.organization.findFirst({
      where: { ownerId: id, deletedAt: null },
      include: { paymentSettings: true },
    })

    return {
      user: { id, name, email, image: image ?? null },
      organization,
    }
  },
)

export type AppOrganization = Awaited<
  ReturnType<typeof loadAppContext>
>['organization']
