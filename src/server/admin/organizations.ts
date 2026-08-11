import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { listOrganizationsInputSchema } from '#/lib/validation/admin.ts'
import {
  getOrganizationDetailHandler,
  listOrganizationsHandler,
  setOrganizationActiveHandler,
  setOrganizationVerifiedHandler,
} from '#/server/admin/organizations.server.ts'

/** RPC-laag voor organisatiebeheer; logica in `organizations.server.ts`. */

export const listOrganizations = createServerFn({ method: 'GET' })
  .validator(listOrganizationsInputSchema)
  .handler(({ data }) => listOrganizationsHandler(data))

export const getOrganizationDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ organizationId: z.uuid() }))
  .handler(({ data }) => getOrganizationDetailHandler(data))

export const setOrganizationActive = createServerFn({ method: 'POST' })
  .validator(z.object({ organizationId: z.uuid(), active: z.boolean() }))
  .handler(({ data }) => setOrganizationActiveHandler(data))

export const setOrganizationVerified = createServerFn({ method: 'POST' })
  .validator(z.object({ organizationId: z.uuid(), verified: z.boolean() }))
  .handler(({ data }) => setOrganizationVerifiedHandler(data))
