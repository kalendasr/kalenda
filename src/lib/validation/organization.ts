import { z } from 'zod'

/**
 * Gedeelde validatieschemas voor de organisatie (DATABASE_DOMAIN.md §4).
 */

/** Leeg tekstveld uit een formulier normaliseren naar `undefined`. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

/** Optionele URL die ook een leeg formulierveld accepteert. */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()
  .refine(
    (value) => value === undefined || z.url().safeParse(value).success,
    'Vul een geldige URL in (bijvoorbeeld https://…).',
  )

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()
  .refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    'Vul een geldig e-mailadres in.',
  )

/** Aanmaken (onboarding): alleen de naam is verplicht. */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Vul de naam van je organisatie in.'),
})

/** Algemene gegevens: volledige set velden, alles behalve de naam optioneel. */
export const organizationGeneralSchema = z.object({
  name: z.string().trim().min(2, 'Vul de naam van je organisatie in.'),
  description: optionalText,
  email: optionalEmail,
  phone: optionalText,
  website: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  linkedin: optionalUrl,
  address: optionalText,
  city: optionalText,
  country: z.string().trim().min(1).default('Suriname'),
})

/** Branding: afbeeldingen worden geüpload en als URL opgeslagen. */
export const organizationBrandingSchema = z.object({
  logo: optionalText,
  coverImage: optionalText,
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type OrganizationGeneralInput = z.infer<typeof organizationGeneralSchema>
export type OrganizationBrandingInput = z.infer<
  typeof organizationBrandingSchema
>
