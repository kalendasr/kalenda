/**
 * Vriendelijke apparaatnaam uit een user-agent. Puur en testbaar. Bewust grof:
 * we willen alleen dat de organisator zijn eigen telefoon herkent in de lijst,
 * geen exacte versiedetectie.
 */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Onbekend apparaat'
  const ua = userAgent.toLowerCase()

  const os = ua.includes('iphone')
    ? 'iPhone'
    : ua.includes('ipad')
      ? 'iPad'
      : ua.includes('android')
        ? 'Android'
        : ua.includes('windows')
          ? 'Windows'
          : ua.includes('mac os')
            ? 'Mac'
            : ua.includes('linux')
              ? 'Linux'
              : null

  // Volgorde telt: Edge/Chrome bevatten allebei "safari"/"chrome"-tokens.
  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('firefox')
      ? 'Firefox'
      : ua.includes('chrome') || ua.includes('crios')
        ? 'Chrome'
        : ua.includes('safari')
          ? 'Safari'
          : null

  if (browser && os) return `${browser} op ${os}`
  if (os) return os
  if (browser) return browser
  return 'Onbekend apparaat'
}
