import { useEffect, useState } from 'react'
import type { BookResult, BookStatus } from '../types/book'
import { coverPalette } from '../lib/coverColor'

interface AddBookModalProps {
  book: BookResult
  onConfirm: (status: BookStatus, finishedAt?: Date) => void
  onClose: () => void
  error?: string | null
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i)
  const selMonth = value ? value.split('-')[1] ?? '' : ''
  const selYear  = value ? value.split('-')[0] ?? '' : ''

  const handleMonth = (m: string) => {
    const y = selYear || String(currentYear)
    onChange(m ? `${y}-${m}` : '')
  }
  const handleYear = (y: string) => {
    const m = selMonth || String(new Date().getMonth() + 1).padStart(2, '0')
    onChange(y ? `${y}-${m}` : '')
  }

  const sel = 'flex-1 rounded-xl bg-slate-700/60 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/5 transition focus:ring-indigo-500/60 appearance-none'
  return (
    <div className="flex gap-2">
      <select value={selMonth} onChange={(e) => handleMonth(e.target.value)} className={sel} style={{ colorScheme: 'dark' }}>
        <option value="">Mois</option>
        {MONTHS_FR.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
      </select>
      <select value={selYear} onChange={(e) => handleYear(e.target.value)} className={`${sel} max-w-[96px]`} style={{ colorScheme: 'dark' }}>
        <option value="">Année</option>
        {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
      </select>
    </div>
  )
}

function toMonthInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fromMonthInput(s: string): Date | null {
  if (!s) return null
  const d = new Date(s + '-01T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

const STATUSES: { key: BookStatus; label: string; active: string }[] = [
  { key: 'read',    label: 'Lu',       active: 'bg-emerald-600 shadow-emerald-900/50' },
  { key: 'reading', label: 'En cours', active: 'bg-indigo-600 shadow-indigo-900/50' },
  { key: 'to_read', label: 'À lire',   active: 'bg-slate-600 shadow-black/20' },
]

export default function AddBookModal({ book, onConfirm, onClose, error }: AddBookModalProps) {
  const [status, setStatus] = useState<BookStatus | null>(null)
  const [finishedAtInput, setFinishedAtInput] = useState(toMonthInput(new Date()))
  const [showFullDesc, setShowFullDesc] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [coverSrc, setCoverSrc] = useState(toHttps(book.cover_url))
  const fallbackSrc = toHttps(book.thumbnail_url ?? '')
  const palette = coverPalette(book.title)
  const year = book.published_date?.split('-')[0]

  const handleConfirm = () => {
    if (!status) return
    if (status === 'read') {
      onConfirm('read', fromMonthInput(finishedAtInput) ?? new Date())
    } else {
      onConfirm(status)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-t-[28px] bg-slate-950 max-h-[92vh] flex flex-col sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Hero ── */}
        <div className="relative shrink-0 overflow-hidden px-5 pb-6 pt-14">
          {coverSrc ? (
            <img
              src={coverSrc}
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover"
              style={{ filter: 'blur(30px) brightness(0.22) saturate(1.8)' }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${palette.bg}80 0%, transparent 65%)` }}
            />
          )}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-slate-950" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative z-10 flex items-end gap-4">
            <div className="h-36 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt={book.title}
                  className="h-full w-full object-cover"
                  onError={() => {
                    if (coverSrc !== fallbackSrc && fallbackSrc) setCoverSrc(fallbackSrc)
                    else setCoverSrc('')
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: palette.bg }}>
                  <span className="text-4xl font-bold opacity-60" style={{ color: palette.fg }}>
                    {book.title[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-lg font-bold leading-snug text-white">{book.title}</p>
              {book.subtitle && (
                <p className="mt-0.5 text-xs leading-tight text-white/50">{book.subtitle}</p>
              )}
              <p className="mt-1.5 text-sm text-white/60">{book.authors.join(', ')}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
                {year && <span>{year}</span>}
                {year && book.page_count && <span>·</span>}
                {book.page_count && <span>{book.page_count} pages</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-5 min-h-0">
          {/* Synopsis */}
          {book.description && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Synopsis</p>
              <div
                style={{
                  maxHeight: showFullDesc ? 'none' : '96px',
                  overflow: 'hidden',
                }}
              >
                <p className="text-sm leading-relaxed text-slate-400">{book.description}</p>
              </div>
              {book.description.length > 200 && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="mt-1.5 text-xs text-indigo-400 transition hover:text-indigo-300"
                >
                  {showFullDesc ? '↑ Voir moins' : '↓ Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ajouter comme</p>
            <div className="flex rounded-2xl bg-slate-800/60 p-1 ring-1 ring-white/5">
              {STATUSES.map(({ key, label, active }) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition active:scale-[0.97] ${
                    status === key
                      ? `${active} text-white shadow-lg`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date if read */}
          {status === 'read' && (
            <div className="rounded-2xl bg-slate-800/40 px-4 py-4 ring-1 ring-white/5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Terminé en</p>
              <MonthYearPicker value={finishedAtInput} onChange={setFinishedAtInput} />
            </div>
          )}
        </div>

        {/* ── Confirm — always pinned at bottom, never scrolls away ── */}
        <div className="shrink-0 px-5 pb-8 pt-3">
          {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={!status}
            className="w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-30"
          >
            Ajouter à ma bibliothèque
          </button>
        </div>
      </div>
    </div>
  )
}
