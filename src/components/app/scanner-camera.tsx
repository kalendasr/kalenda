import { useEffect, useRef, useState } from 'react'

/**
 * Camera-based QR-scanner (Fase 7, USER_FLOWS #13). Mobiel-eerst: gebruikt de
 * achtercamera en vraagt netjes toestemming. Bij geen camera of geen
 * toestemming wordt `onUnavailable` aangeroepen zodat de route terugvalt op
 * handmatige invoer. De lib (`qr-scanner`) wordt client-side geladen — de
 * worker draait in de browser.
 */
export function ScannerCamera({
  onScan,
  onUnavailable,
  paused,
}: {
  onScan: (payload: string) => void
  onUnavailable: () => void
  paused: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<ScannerInstance | null>(null)
  const onScanRef = useRef(onScan)
  const onUnavailableRef = useRef(onUnavailable)
  const [error, setError] = useState<string | null>(null)

  // Houd de laatste callbacks bij zonder de scanner opnieuw te initialiseren.
  onScanRef.current = onScan
  onUnavailableRef.current = onUnavailable

  useEffect(() => {
    let cancelled = false
    let scanner: ScannerInstance | null = null

    async function start() {
      try {
        const video = videoRef.current
        if (!video) return

        // Dynamisch importeren: houdt de lib + worker buiten de SSR-bundle.
        const QrScanner = (await import('qr-scanner')).default as ScannerCtor
        scanner = new QrScanner(video, ({ data }) => onScanRef.current(data), {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        })
        scannerRef.current = scanner
        await scanner.start()
        if (cancelled) scanner.destroy()
      } catch {
        if (!cancelled) {
          setError(
            'Camera niet beschikbaar — voer het ticketnummer handmatig in.',
          )
          onUnavailableRef.current()
        }
      }
    }

    start()

    return () => {
      cancelled = true
      scanner?.destroy()
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner) return
    if (paused) scanner.stop()
    else scanner.start().catch(() => {})
  }, [paused])

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="size-full object-cover"
        muted
        playsInline
      />
      {/* Scan-hint bovenaan voor wie nog geen toestemming heeft gegeven. */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
          <p className="text-sm">{error}</p>
        </div>
      ) : null}
    </div>
  )
}

// Minimale typering van de bibliotheek (geen types geleverd in dit project).
type ScannerCtor = new (
  video: HTMLVideoElement,
  onDecode: (result: { data: string }) => void,
  options?: {
    preferredCamera?: 'environment' | 'user'
    highlightScanRegion?: boolean
    highlightCodeOutline?: boolean
  },
) => ScannerInstance

type ScannerInstance = {
  start: () => Promise<void>
  stop: () => void
  destroy: () => void
}
