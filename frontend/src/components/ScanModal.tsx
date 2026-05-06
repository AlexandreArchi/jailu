import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface ScanModalProps {
  onScan: (isbn: string) => void
  onClose: () => void
}

export default function ScanModal({ onScan, onClose }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return
    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || detected) return
        const text = result.getText()
        if (/^97[89]\d{10}$/.test(text)) {
          setDetected(true)
          controlsRef.current?.stop()
          onScan(text)
        }
      })
      .then((controls) => {
        controlsRef.current = controls
      })
      .catch(() => {
        setError("Impossible d'accéder à la caméra. Vérifie les permissions.")
      })

    return () => {
      controlsRef.current?.stop()
    }
  }, [onScan, detected])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Full-screen video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Dark overlay with cut-out effect */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Top shadow */}
        <div className="w-full flex-1 bg-black/60" />

        {/* Middle row: side shadows + scan zone */}
        <div className="flex w-full items-center">
          <div className="flex-1 bg-black/60" style={{ minWidth: '5%' }} />
          {/* Scan zone */}
          <div
            className="relative"
            style={{ width: '90%', aspectRatio: '3 / 1.3' }}
          >
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
            <span className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
            {/* Scan line animation */}
            {!detected && !error && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-400/80 animate-scan" />
            )}
            {detected && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-10 w-10 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 bg-black/60" style={{ minWidth: '5%' }} />
        </div>

        {/* Bottom: shadow + instructions */}
        <div className="w-full flex-1 bg-black/60 flex flex-col items-center justify-start pt-6 px-6 text-center">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : detected ? (
            <p className="text-sm font-medium text-emerald-400">ISBN détecté — recherche en cours…</p>
          ) : (
            <p className="text-sm text-slate-300">
              Placez le code-barres au dos du livre dans le cadre
            </p>
          )}
        </div>
      </div>

      {/* Floating close button */}
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
