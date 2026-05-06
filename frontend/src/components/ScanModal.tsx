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
        // EAN-13 starting with 978 or 979 = ISBN-13
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sm:pt-6">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="font-semibold text-white">Scanner un ISBN</p>
      </div>

      {/* Camera */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Overlay avec zone de scan */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="h-28 w-72 rounded-2xl border-2 border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            {detected && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-8 w-8 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {/* Corner decorations */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
              <div key={pos} className={`absolute ${pos} h-4 w-4`} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : detected ? (
          <p className="text-sm font-medium text-emerald-400">ISBN détecté — recherche en cours…</p>
        ) : (
          <p className="text-sm text-slate-400">
            Pointez la caméra vers le code-barres au dos du livre
          </p>
        )}
      </div>
    </div>
  )
}
