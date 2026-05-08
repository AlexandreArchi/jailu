import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

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

const isISBN = (s: string) => /^97[89]\d{10}$/.test(s)

export default function ScanModal({ onScan, onClose }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const detectedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  const found = (isbn: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    setDetected(true)
    onScan(isbn)
  }

  useEffect(() => {
    let stopped = false
    let animFrame: number

    const startCamera = async () => {
      try {
        // getUserMedia : fonctionne sur iOS Safari (pas d'enumerateDevices requis)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            advanced: [{ focusMode: 'continuous' }] as any,
          },
        })
        streamRef.current = stream
        if (stopped || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (typeof BarcodeDetector !== 'undefined') {
          // ── Android / Chrome : BarcodeDetector natif, temps réel rapide ──
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] })
          const tick = async () => {
            if (stopped || detectedRef.current || !videoRef.current) return
            try {
              const results = await detector.detect(videoRef.current)
              for (const r of results) {
                if (isISBN(r.rawValue)) { found(r.rawValue); return }
              }
            } catch { /* vidéo pas encore prête */ }
            animFrame = requestAnimationFrame(tick)
          }
          animFrame = requestAnimationFrame(tick)
        } else {
          // ── iOS : ZXing decodeFromStream — scan continu, sans bouton ──
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromStream(
            stream,
            videoRef.current,
            (result) => {
              if (result && isISBN(result.getText())) found(result.getText())
            },
          )
          controlsRef.current = controls
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
      streamRef.current?.getTracks().forEach((t) => t.stop())
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

      {/* Overlay : zones sombres autour de la bande de scan */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 bg-black/65" style={{ height: '35%' }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/65" style={{ height: '35%' }} />
        <div className="absolute left-0 bg-black/65" style={{ top: '35%', bottom: '35%', width: '6%' }} />
        <div className="absolute right-0 bg-black/65" style={{ top: '35%', bottom: '35%', width: '6%' }} />

        <div className="absolute" style={{ top: '35%', left: '6%', right: '6%', bottom: '35%' }}>
          <span className="absolute top-0 left-0 h-7 w-7 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
          <span className="absolute top-0 right-0 h-7 w-7 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
          <span className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
          <span className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
          {!detected && !error && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-400/80 animate-scan" />
          )}
        </div>
      </div>

      {/* Succès */}
      {detected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/30 ring-2 ring-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-10 w-10 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Barre du bas */}
      <div
        className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-3 px-6 pb-14 pt-6 text-center"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      >
        {detected ? (
          <p className="text-sm font-semibold text-emerald-400">ISBN détecté — recherche en cours…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
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
