import { getRequest } from '@tanstack/react-start/server'

/**
 * Simpel in-memory sliding-window rate limit voor publieke endpoints waarvan
 * het ordernummer het enige "geheim" is (`getOrderByNumber`,
 * `submitProofOfPayment`) — zonder dit is enumeratie van het ~40-bit
 * ordernummer alleen beperkt door netwerklatency.
 *
 * Bewust in-memory: de app draait als één Node-proces achter Caddy (zie
 * infra/DEPLOY.md — PM2 in fork-modus, één instantie, geen clustering), dus
 * een module-level Map is genoeg om brute-force onpraktisch te maken. Bij een herstart of een
 * toekomstige multi-instance-deploy reset dit — een Redis-achtige gedeelde
 * teller is voor de MVP-schaal van dit platform premature complexiteit.
 */
const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; windowStart: number }>()

// Voorkomt dat de Map onbeperkt groeit onder aanhoudend verkeer/misbruik.
const MAX_BUCKETS = 10_000

function clientIp(): string {
  const headers = getRequest().headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim()
  return 'unknown'
}

/**
 * Gooit een leesbare fout als `scope` (endpoint) + de aanroepende IP het
 * toegestane aantal pogingen binnen het venster overschrijdt.
 */
export function enforceRateLimit(scope: string, limit: number): void {
  const key = `${scope}:${clientIp()}`
  const now = Date.now()

  if (buckets.size > MAX_BUCKETS) buckets.clear()

  const bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    return
  }

  bucket.count += 1
  if (bucket.count > limit) {
    throw new Error('Te veel pogingen. Wacht even en probeer het opnieuw.')
  }
}
