import type { CheckInResult } from '#/lib/scan-result.ts'
import { SCAN_RESULT_DESCRIPTIONS } from '#/lib/scan-result.ts'
import { defineNotification } from '#/lib/notifications/types.ts'

export type ScanUnusualData = {
  eventId: string
  /** Alleen de niet-goede resultaten belanden hier. */
  result: Exclude<CheckInResult, 'Valid'>
}

/**
 * Organisator: een ongebruikelijke scan bij de deur (al ingecheckt, ongeldig of
 * onbekend). Wordt alleen verstuurd als iemand ánders scande dan de organisator
 * zelf — die beslissing zit op de aanroepplek in scanner.ts, niet hier.
 */
export const scanUnusual = defineNotification<ScanUnusualData>({
  key: 'scan.unusual',
  label: 'Ongebruikelijke scan',
  description:
    'Als bij de deur een al gescand of ongeldig ticket wordt aangeboden.',
  audienceKind: 'organizer',
  toggleable: true,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Let op bij de deur',
    body: SCAN_RESULT_DESCRIPTIONS[data.result],
    url: `/events/${data.eventId}/scanner`,
    // Collapse per event: bij een drukke deur ziet de organisator de laatste
    // waarschuwing, niet tien losse meldingen boven elkaar.
    tag: `scan-unusual:${data.eventId}`,
  }),
})
