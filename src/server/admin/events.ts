import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { listEventsInputSchema } from '#/lib/validation/admin.ts'
import {
  archiveEventAdminHandler,
  deleteEventAdminHandler,
  getEventDetailHandler,
  listEventsHandler,
  publishEventAdminHandler,
  unpublishEventAdminHandler,
} from '#/server/admin/events.server.ts'

/** RPC-laag voor evenementbeheer; logica in `events.server.ts`. */

const eventIdSchema = z.object({ eventId: z.uuid() })

export const listEvents = createServerFn({ method: 'GET' })
  .validator(listEventsInputSchema)
  .handler(({ data }) => listEventsHandler(data))

export const getEventDetail = createServerFn({ method: 'GET' })
  .validator(eventIdSchema)
  .handler(({ data }) => getEventDetailHandler(data))

export const publishEventAdmin = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(({ data }) => publishEventAdminHandler(data))

export const unpublishEventAdmin = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(({ data }) => unpublishEventAdminHandler(data))

export const archiveEventAdmin = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(({ data }) => archiveEventAdminHandler(data))

export const deleteEventAdmin = createServerFn({ method: 'POST' })
  .validator(eventIdSchema)
  .handler(({ data }) => deleteEventAdminHandler(data))
