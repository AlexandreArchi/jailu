import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

// Native BarcodeDetector API (Chrome/Android)
type NativeDetector = {
  detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => NativeDetector
declare const BarcodeDetector: BarcodeDetectorCtor | undefined

interface ScanModalProps {
  onScan: (isbn: string) => void
  onClose: () => void
}

export default function ScanModal({ onScan, onClose }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const detectedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    let animFrame: number
    let stream: MediaStream | null = null
    let stopped = false

    const found = (isbn: string) => {
      if (detectedRef.current) return
      detectedRef.current = true
      setDetected(true)
      onScan(isbn)
    }

    const startCamera = async () => {
      try {
        // Open camera manually for BarcodeDetector path; ZXing opens its own if needed
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (stopped || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (typeof BarcodeDetector !== 'undefined') {
          // Fast native path — hardware-accelerated on Android Chrome
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] })
          const tick = async () => {
            if (stopped || detectedRef.current || !videoRef.current) return
            try {
              const results = await detector.detect(videoRef.current)
              for (const r of results) {
                if (/^97[89]\d{10}$/.test(r.rawValue)) { found(r.rawValue); return }
              }
            } catch { /* video not ready yet */ }
            animFrame = requestAnimationFrame(tick)
          }
          animFrame = requestAnimationFrame(tick)
        } else {
          // ZXing fallback — for iOS Safari which lacks BarcodeDetector
          // Stop our stream first; ZXing will reopen camera itself
          stream.getTracks().forEach((t) => t.stop())
          stream = null
          if (videoRef.current) videoRef.current.srcObject = null

          const reader = new BrowserMultiFormatReader()
          reader
            .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
              if (!result || detectedRef.current) return
              const text = result.getText()
              if (/^97[89]\d{10}$/.test(text)) {
                found(text)
                controlsRef.current?.stop()
              }
            })
            .then((controls) => { controlsRef.current = controls })
            .catch(() => { if (!stopped) setError("Impossible d'accéder à la caméra.") })
        }
      } catch {
        if (!stopped) setError("Impossible d'accéder à la caméra. Vérifie les permissions.")
      }
    }

    void startCamera()

    return () => {
      stopped = true
      cancelAnimationFrame(animFrame)
      controlsRef.current?.stop()
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Vignette sur les bords */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* Coins aux angles */}
      <div className="absolute inset-4 pointer-events-none">
        <span className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-indigo-400/80 rounded-tl-xl" />
        <span className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-indigo-400/80 rounded-tr-xl" />
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-indigo-400/80 rounded-bl-xl" />
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-indigo-400/80 rounded-br-xl" />
        {!detected && !error && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-400/70 animate-scan" />
        )}
      </div>

      {detected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/30 ring-2 ring-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-10 w-10 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      <div
        className="absolute bottom-0 inset-x-0 px-6 pb-12 pt-8 text-center"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
      >
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : detected ? (
          <p className="text-sm font-semibold text-emerald-400">ISBN détecté — recherche en cours…</p>
        ) : (
          <p className="text-sm text-white/80">Pointez la caméra vers le code-barres du livre</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute top-12 right-4 sm:top-6 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label="Fermer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
