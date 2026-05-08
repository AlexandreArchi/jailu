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
  const [debugLog, setDebugLog] = useState<string>('démarrage…')
  const [showShutter, setShowShutter] = useState(false)
  const [capturing, setCapturing] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const isIOS = typeof BarcodeDetector === 'undefined'

  const log = (msg: string) => {
    console.log('[Scanner]', msg)
    setDebugLog(msg)
  }

  const found = (isbn: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    setDetected(true)
    onScan(isbn)
  }

  /** Capture manuelle : snapshot haute résolution → ZXing image statique */
  const captureAndDecode = async () => {
    const video = videoRef.current
    if (!video || detectedRef.current) return
    setCapturing(true)
    log('capture manuelle…')

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

    try {
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageUrl(dataUrl)
      const text = result.getText()
      log(`capture: ${text}`)
      if (isISBN(text)) {
        found(text)
      } else {
        setError(`Code non reconnu (${text}). Réessayez.`)
      }
    } catch {
      setError('Aucun code-barres détecté. Rapprochez-vous et réessayez.')
      log('capture: rien détecté')
    } finally {
      setCapturing(false)
    }
  }

  useEffect(() => {
    let stopped = false
    let animFrame: number

    const startCamera = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const nativeDetector = typeof BarcodeDetector !== 'undefined'
        log(nativeDetector ? 'Android — BarcodeDetector' : 'iOS — ZXing')

        if (nativeDetector) {
          // ── Android : stream manuel + BarcodeDetector natif ──
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
          if (stopped || !videoRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          log('caméra active…')

          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] })
          const tick = async () => {
            if (stopped || detectedRef.current || !videoRef.current) return
            try {
              const results = await detector.detect(videoRef.current)
              for (const r of results) {
                if (isISBN(r.rawValue)) { found(r.rawValue); return }
                log(`code non-ISBN: ${r.rawValue}`)
              }
            } catch { /* vidéo pas encore prête */ }
            animFrame = requestAnimationFrame(tick)
          }
          animFrame = requestAnimationFrame(tick)
        } else {
          // ── iOS : ZXing continu via decodeFromConstraints ──
          if (!videoRef.current) return
          log('ZXing: démarrage…')
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            },
            videoRef.current,
            (result, err) => {
              if (result) {
                const text = result.getText()
                log(`lu: ${text}`)
                if (isISBN(text)) found(text)
              } else if (err?.name !== 'NotFoundException') {
                log(`err: ${err?.message ?? '?'}`)
              }
            },
          )
          if (stopped) { controls.stop(); return }
          controlsRef.current = controls

          // Vidéo injectée par ZXing — on synchronise notre ref
          const injectedVideo = document.querySelector<HTMLVideoElement>('#__zxing_video__') ?? videoRef.current
          streamRef.current = injectedVideo.srcObject as MediaStream | null

          log('ZXing actif — pointez le code')

          // Après 3 s sans détection, proposer le bouton shutter
          setTimeout(() => {
            if (!detectedRef.current && !stopped) setShowShutter(true)
          }, 3000)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!stopped) {
          setError(`Erreur: ${msg}`)
          log(`erreur: ${msg}`)
          if (isIOS) setShowShutter(true)
        }
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
  }, [onScan]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Overlay zones sombres */}
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
        className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-4 px-6 pb-14 pt-6 text-center"
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
            {isIOS && (
              <button
                onClick={() => { setError(null); void captureAndDecode() }}
                className="h-16 w-16 rounded-full bg-white ring-4 ring-white/30 transition active:scale-90"
                aria-label="Réessayer"
              />
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-white/80">
              {showShutter ? 'Appuyez pour capturer' : 'Pointez la caméra vers le code-barres'}
            </p>
            {/* Bouton shutter affiché sur iOS après 3 s */}
            {isIOS && showShutter && (
              <button
                onClick={() => void captureAndDecode()}
                className="h-16 w-16 rounded-full bg-white ring-4 ring-white/30 transition active:scale-90"
                aria-label="Capturer"
              />
            )}
          </>
        )}

        {/* Debug log — blanc, visible */}
        <p className="text-xs text-white/60 font-mono">{debugLog}</p>
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
