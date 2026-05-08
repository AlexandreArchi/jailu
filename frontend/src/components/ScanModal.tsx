import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

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
  const detectedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const [capturing, setCapturing] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const hasNativeDetector = typeof BarcodeDetector !== 'undefined'

  const found = (isbn: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    setDetected(true)
    onScan(isbn)
  }

  /** iOS path — ouvre l'appareil photo natif via file input, décode avec html5-qrcode */
  const handleScanButton = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || detectedRef.current) return
    setCapturing(true)
    setError(null)
    try {
      const scanner = new Html5Qrcode('__html5qrcode_div__')
      const result = await scanner.scanFile(file, false)
      if (isISBN(result)) {
        found(result)
      } else {
        setError('Code non reconnu. Réessayez.')
      }
    } catch {
      setError('Aucun code-barres détecté. Rapprochez-vous et réessayez.')
    } finally {
      setCapturing(false)
      // Reset pour permettre de re-scanner
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    let animFrame: number
    let stopped = false

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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
          // ── Android / Chrome : native hardware detection, real-time ──
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] })
          const tick = async () => {
            if (stopped || detectedRef.current || !videoRef.current) return
            try {
              const results = await detector.detect(videoRef.current)
              for (const r of results) {
                if (isISBN(r.rawValue)) { found(r.rawValue); return }
              }
            } catch { /* video not ready */ }
            animFrame = requestAnimationFrame(tick)
          }
          animFrame = requestAnimationFrame(tick)
        }
        // ── iOS : pas de détection en continu — l'utilisateur prend une photo via le bouton ──
      } catch {
        if (!stopped) setError("Impossible d'accéder à la caméra. Vérifie les permissions.")
      }
    }

    void startCamera()

    return () => {
      stopped = true
      cancelAnimationFrame(animFrame)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Div requis par html5-qrcode (caché) */}
      <div id="__html5qrcode_div__" style={{ display: 'none' }} />

      {/* Input file caché — ouvre l'appareil photo natif iOS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Scan zone : bande horizontale rectangulaire */}
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
          {!detected && !error && !capturing && (
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
        className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-5 px-6 pb-14 pt-6 text-center"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      >
        {detected ? (
          <p className="text-sm font-semibold text-emerald-400">ISBN détecté — recherche en cours…</p>
        ) : capturing ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm text-white/80">Décodage…</p>
          </div>
        ) : error ? (
          <>
            <p className="text-sm text-red-400">{error}</p>
            {!hasNativeDetector && (
              <button
                onClick={handleScanButton}
                className="h-16 w-16 rounded-full bg-white ring-4 ring-white/30 transition active:scale-90"
                aria-label="Réessayer"
              />
            )}
          </>
        ) : !hasNativeDetector ? (
          /* ── iOS : bouton shutter → ouvre l'appareil photo natif ── */
          <>
            <p className="text-sm text-white/70">Cadrez le code-barres puis appuyez</p>
            <button
              onClick={handleScanButton}
              className="h-16 w-16 rounded-full bg-white ring-4 ring-white/30 transition active:scale-90"
              aria-label="Scanner"
            />
          </>
        ) : (
          /* ── Android : auto-détection ── */
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
