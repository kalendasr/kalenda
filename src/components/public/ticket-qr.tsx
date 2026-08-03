import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

import { ticketQrPayload } from '#/lib/ticket-qr.ts'

/**
 * Klant-zijde QR-renderer voor een ticket (Fase 6, BR-700/704).
 *
 * Gebruikt dezelfde payload als de server (`ticketQrPayload`), zodat de QR op
 * het scherm en op de PDF altijd gelijk zijn en bij opnieuw versturen hetzelfde
 * blijven. Rendert via `qrcode` naar een `<canvas>` — geen extra asset node.
 */

export function TicketQr({
  ticketNumber,
  baseUrl,
  size = 160,
}: {
  ticketNumber: string
  baseUrl: string
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    QRCode.toCanvas(
      canvas,
      ticketQrPayload(ticketNumber, baseUrl),
      {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: size,
      },
      (err) => {
        if (cancelled) return
        if (err) setError(true)
      },
    )

    return () => {
      cancelled = true
    }
  }, [ticketNumber, baseUrl, size])

  if (error) {
    return (
      <div
        className="flex items-center justify-center border bg-muted text-xs text-muted-foreground"
        style={{ width: size, height: size }}
        aria-label="QR-code kon niet geladen worden"
      >
        QR niet beschikbaar
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={`QR-code voor ticket ${ticketNumber}`}
    />
  )
}
