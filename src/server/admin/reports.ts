import { createServerFn } from '@tanstack/react-start'

import { platformReportInputSchema } from '#/lib/validation/admin.ts'
import { getPlatformReportHandler } from '#/server/admin/reports.server.ts'

/** RPC-laag voor de platformrapportage; logica in `reports.server.ts`. */

export const getPlatformReport = createServerFn({ method: 'GET' })
  .validator(platformReportInputSchema)
  .handler(({ data }) => getPlatformReportHandler(data))
