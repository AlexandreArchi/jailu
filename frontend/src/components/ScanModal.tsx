import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface ScanModalProps {
  onScan: (isbn: string) => void
  onClose: () => void
}

const isISBN = (s: string) => /^97[89]\d{10}$/.test(s)

export default function ScanModal({ onScan, onClose }: ScanModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const detectedRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode('__qr_reader__')
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: { ideal: 'environment' } },
        { fps: 15 },
        (text) => {
          if (!isISBN(text) || detectedRef.current) return
          detectedRef.current = true
          setDetected(true)
          void scanner.stop().catch(() => {})
          onScan(text)
        },
        () => {}, // erreurs par frame ignorées (normal)
      )
      .catch(() => setError("Impossible d'accéder à la caméra. Vérifie les permissions."))

    return () => {
      void scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Style pour que la vidéo html5-qrcode remplisse tout l'écran */}
      <style>{`
        #__qr_reader__ { position: absolute; inset: 0; }
        #__qr_reader__ video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #__qr_reader__ canvas { display: none !important; }
        #__qr_reader__ > div { border: none !important; box-shadow: none !important; }
        #__qr_reader__ img { display: none !important; }
      `}</style>

      {/* Conteneur html5-qrcode — il crée la vidéo à l'intérieur */}
      <div id="__qr_reader__" />

      {/* Overlay : zones sombres autour de la bande de scan */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-x-0 top-0 bg-black/65" style={{ height: '35%' }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/65" style={{ height: '35%' }} />
        <div className="absolute left-0 bg-black/65" style={{ top: '35%', bottom: '35%', width: '6%' }} />
        <div className="absolute right-0 bg-black/65" style={{ top: '35%', bottom: '35%', width: '6%' }} />

        {/* Coins + ligne de scan animée */}
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
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/30 ring-2 ring-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-10 w-10 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Barre du bas */}
      <div
        className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center gap-3 px-6 pb-14 pt-6 text-center"
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

      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-12 right-4 sm:top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label="Fermer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
