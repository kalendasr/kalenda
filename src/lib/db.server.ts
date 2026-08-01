import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '#/generated/prisma/client.ts'
import { getServerEnv } from '#/lib/env.server.ts'

/**
 * Eén gedeelde Prisma client. In development houdt de HMR-reload anders bij
 * iedere wijziging een nieuwe connectiepool aan.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createPrismaClient() {
  const env = getServerEnv()

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (getServerEnv().NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
