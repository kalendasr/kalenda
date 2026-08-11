import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { listOrdersInputSchema } from '#/lib/validation/admin.ts'
import {
  getOrderDetailHandler,
  listOrdersHandler,
} from '#/server/admin/orders.server.ts'

/** RPC-laag voor het bestellingenoverzicht; logica in `orders.server.ts`. */

export const listOrders = createServerFn({ method: 'GET' })
  .validator(listOrdersInputSchema)
  .handler(({ data }) => listOrdersHandler(data))

export const getOrderDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ orderNumber: z.string().min(1).max(40) }))
  .handler(({ data }) => getOrderDetailHandler(data))
