import { z } from 'zod'

/**
 * Gedeelde validatieschemas voor authenticatie.
 *
 * Eén bron van waarheid: dezelfde schemas valideren zowel het formulier in de
 * browser als de server (CLAUDE.md §28, DATABASE_DOMAIN.md §1).
 */

const MIN_PASSWORD_LENGTH = 12

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Gebruik minimaal ${MIN_PASSWORD_LENGTH} tekens.`)

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Vul je voornaam in.'),
  lastName: z.string().trim().min(1, 'Vul je achternaam in.'),
  email: z.email('Vul een geldig e-mailadres in.'),
  phone: z.string().trim().optional(),
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.email('Vul een geldig e-mailadres in.'),
  password: z.string().min(1, 'Vul je wachtwoord in.'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Vul een geldig e-mailadres in.'),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'De wachtwoorden komen niet overeen.',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
