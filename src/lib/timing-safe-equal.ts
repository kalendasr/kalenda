import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time stringvergelijking voor secrets (bv. de cron-`Authorization`-
 * header). Een gewone `===` stopt bij het eerste verschillende teken en lekt
 * daarmee (in theorie, over voldoende requests) hoe lang het geheim overeenkomt.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Nog steeds een vergelijking van gelijke lengte uitvoeren, zodat de
    // looptijd niet verraadt of de lengte al fout was.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}
