import { CircleAlert } from 'lucide-react'

import { Alert, AlertDescription } from '#/components/ui/alert.tsx'

/**
 * Formulierbrede foutmelding (bijv. "e-mailadres al in gebruik"). Toont niets
 * wanneer er geen fout is, zodat schermen dit onvoorwaardelijk kunnen plaatsen.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
