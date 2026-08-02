import 'dotenv/config'
import { z } from 'zod'

/**
 * Server-side environment.
 *
 * Wordt gevalideerd bij de eerste toegang, zodat een ontbrekende variabele
 * meteen een duidelijke fout geeft in plaats van een onverklaarbare crash.
 *
 * De env is opgesplitst per verantwoordelijkheid: alleen wat de applicatie
 * altijd nodig heeft staat in de kern. Optionele integraties valideren hun
 * eigen variabelen op het moment dat ze gebruikt worden, zodat je lokaal kunt
 * werken zonder alle externe accounts.
 */

function parse<T extends z.ZodType>(schema: T, onderdeel: string): z.infer<T> {
  const result = schema.safeParse(process.env)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Ongeldige of ontbrekende environment variabelen voor ${onderdeel}:\n${details}\n\nKopieer .env.example naar .env en vul de waarden in.`,
    )
  }

  return result.data
}

const coreEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Database
  DATABASE_URL: z.url(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
})

const storageEnvSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.url(),
})

const mailEnvSchema = z.object({
  MAIL_API_KEY: z.string().min(1),
  MAIL_AFZENDER_NAAM: z.string().min(1),
  MAIL_AFZENDER_EMAIL: z.email(),
})

export type ServerEnv = z.infer<typeof coreEnvSchema>
export type StorageEnv = z.infer<typeof storageEnvSchema>
export type MailEnv = z.infer<typeof mailEnvSchema>

let cachedServerEnv: ServerEnv | undefined
let cachedStorageEnv: StorageEnv | undefined
let cachedMailEnv: MailEnv | undefined

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parse(coreEnvSchema, 'de applicatie')
  return cachedServerEnv
}

/** Cloudflare R2. Valideert pas wanneer er daadwerkelijk opgeslagen wordt. */
export function getStorageEnv(): StorageEnv {
  cachedStorageEnv ??= parse(storageEnvSchema, 'bestandsopslag (Cloudflare R2)')
  return cachedStorageEnv
}

/** Resend e-mail. Valideert pas wanneer er daadwerkelijk gemaild wordt. */
export function getMailEnv(): MailEnv {
  cachedMailEnv ??= parse(mailEnvSchema, 'e-mail (Resend)')
  return cachedMailEnv
}
