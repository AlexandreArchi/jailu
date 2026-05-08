import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from '../lib/firebase'
import { updateBook, deleteBook, updateBookCover, createStory } from '../lib/firestore'
import { BOOK_STATUS_LABELS, type BookStatus, type UserBook } from '../types/book'
import { coverPalette } from '../lib/coverColor'
import RecommendBookModal from './RecommendBookModal'

interface BookDetailModalProps {
  book: UserBook
  onClose: () => void
  onUpdated: () => void
  readOnly?: boolean
}

const STATUSES: BookStatus[] = ['read', 'reading', 'to_read']
const STATUS_COLORS: Record<BookStatus, string> = {
  read: 'bg-emerald-600 shadow-emerald-900/50',
  reading: 'bg-indigo-600 shadow-indigo-900/50',
  to_read: 'bg-slate-600 shadow-black/20',
}
const STATUS_BADGE: Record<BookStatus, string> = {
  read: 'bg-emerald-500/15 text-emerald-400',
  reading: 'bg-indigo-500/15 text-indigo-400',
  to_read: 'bg-slate-700/60 text-slate-400',
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative h-9 w-9" onMouseLeave={() => setHovered(null)}>
            <span className="absolute inset-0 flex items-center justify-center text-[26px] text-slate-700">★</span>
            <span
              className="absolute inset-0 flex items-center justify-center text-[26px] text-amber-400 transition-opacity"
              style={{ opacity: full || half ? 1 : 0, clipPath: half ? 'inset(0 50% 0 0)' : undefined }}
            >★</span>
            <button
              className="absolute left-0 top-0 h-full w-1/2"
              onClick={() => onChange(value === star - 0.5 ? null : star - 0.5)}
              onMouseEnter={() => setHovered(star - 0.5)}
              aria-label={`${star - 0.5} étoile`}
            />
            <button
              className="absolute right-0 top-0 h-full w-1/2"
              onClick={() => onChange(value === star ? null : star)}
              onMouseEnter={() => setHovered(star)}
              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
            />
          </div>
        )
      })}
    </div>
  )
}

// Month/year helpers (type="month" uses YYYY-MM)
function toMonthInput(d: Date | null): string {
  if (!d) return ''
  const y = new Date(d).getFullYear()
  const m = String(new Date(d).getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function fromMonthInput(s: string): Date | null {
  if (!s) return null
  const d = new Date(s + '-01T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

function formatMonthYear(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function ReadOnlyStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const full = rating >= star
          const half = !full && rating >= star - 0.5
          return (
            <span key={star} className="relative text-2xl">
              <span className="text-slate-700">★</span>
              {(full || half) && (
                <span
                  className="absolute inset-0 text-amber-400"
                  style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
                >★</span>
              )}
            </span>
          )
        })}
      </div>
      <span className="text-sm font-semibold text-amber-400">{rating} / 5</span>
    </div>
  )
}

export default function BookDetailModal({ book, onClose, onUpdated, readOnly = false }: BookDetailModalProps) {
  const [status, setStatus] = useState<BookStatus>(book.status)
  const [rating, setRating] = useState<number | null>(book.rating)
  const [notes, setNotes] = useState(book.notes ?? '')
  const [finishedAtInput, setFinishedAtInput] = useState(toMonthInput(book.finishedAt))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [showStoryPrompt, setShowStoryPrompt] = useState(false)
  const [quotes, setQuotes] = useState<string[]>(book.quotes ?? [])
  const [newQuote, setNewQuote] = useState('')
  const coverFileRef = useRef<HTMLInputElement>(null)

  const year = book.publishedDate?.split('-')[0]
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [coverSrc, setCoverSrc] = useState(toHttps(book.coverUrl))
  const fallbackSrc = toHttps(book.thumbnailUrl ?? '')
  const palette = coverPalette(book.title)

  const handleCoverUpload = async (file: File) => {
    const userId = auth.currentUser?.uid
    if (!userId) return
    setIsUploadingCover(true)
    try {
      const storageRef = ref(storage, `bookCovers/${userId}/${Date.now()}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateBookCover(book.id, url)
      setCoverSrc(url)
    } finally {
      setIsUploadingCover(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const becomingRead = status === 'read' && book.status !== 'read'
    const finishedAt = fromMonthInput(finishedAtInput)
    const extra: { finishedAt?: Date | null } = { finishedAt }
    if (!finishedAt && status === 'read') extra.finishedAt = new Date()
    await updateBook(book.id, { status, rating, notes: notes.trim() || null, quotes, ...extra })
    setIsSaving(false)
    onUpdated()
    if (becomingRead) {
      setShowStoryPrompt(true)
    } else {
      onClose()
    }
  }

  const handleShare = async () => {
    const authorStr = book.authors.join(', ')
    const ratingStr = rating ? ` · ${rating}/5 ⭐` : ''
    const text = `Je t'ai recommandé "${book.title}" de ${authorStr}${ratingStr} 📚\n\nDécouvre JAILU, l'app pour suivre tes lectures :`
    const url = 'https://jailu-prod.web.app'
    if (navigator.share) {
      try { await navigator.share({ title: book.title, text, url }) } catch { /* cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setIsDeleting(true)
    await deleteBook(book.id)
    onUpdated()
    onClose()
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
        {/* ── Story sharing prompt ── */}
        {showStoryPrompt && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-slate-950/96 px-8 text-center backdrop-blur-sm">
            <div className="h-32 w-22 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
              style={{ width: '88px', height: '128px' }}>
              {coverSrc ? (
                <img src={coverSrc} alt={book.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: palette.bg }}>
                  <span className="text-3xl font-bold opacity-60" style={{ color: palette.fg }}>
                    {book.title[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-white">Partager ta lecture ?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                Tes amis verront que tu as terminé<br />
                <span className="font-semibold text-white">"{book.title}"</span>
              </p>
            </div>
            <div className="flex w-full flex-col gap-2.5">
              <button
                onClick={() => {
                  void createStory(
                    { title: book.title, authors: book.authors, coverUrl: book.coverUrl, thumbnailUrl: book.thumbnailUrl, googleBooksId: book.googleBooksId },
                    rating,
                  )
                  onClose()
                }}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98]"
              >
                Partager en story ✨
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-2xl py-2.5 text-sm text-slate-500 transition hover:text-slate-300"
              >
                Pas maintenant
              </button>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <div className="relative shrink-0 overflow-hidden px-5 pb-6 pt-14">
          {/* Blurred cover background */}
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
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
          {/* Bottom fade to body */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-slate-950" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Cover + book info */}
          <div className="relative z-10 flex items-end gap-4">
            {/* Cover */}
            <div className="relative shrink-0">
              <div className="h-36 w-24 overflow-hidden rounded-2xl bg-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
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
              {/* Cover edit button */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={isUploadingCover}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 ring-2 ring-slate-950 text-slate-300 transition hover:text-white"
                  aria-label={coverSrc ? 'Changer la couverture' : 'Ajouter une couverture'}
                >
                  {isUploadingCover ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-white" />
                  ) : coverSrc ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              )}
              <input
                ref={coverFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCoverUpload(f) }}
              />
            </div>

            {/* Text info */}
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-lg font-bold leading-snug text-white">{book.title}</p>
              {book.subtitle && (
                <p className="mt-0.5 text-xs leading-tight text-white/50">{book.subtitle}</p>
              )}
              <p className="mt-1.5 text-sm text-white/60">{book.authors.join(', ')}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
                {year && <span>{year}</span>}
                {year && book.pageCount && <span>·</span>}
                {book.pageCount && <span>{book.pageCount} pages</span>}
              </div>
              {book.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {book.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">

          {/* Status */}
          {readOnly ? (
            <div className="flex justify-center">
              <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_BADGE[status]}`}>
                {BOOK_STATUS_LABELS[status]}
              </span>
            </div>
          ) : (
            <div className="flex rounded-2xl bg-slate-800/60 p-1 ring-1 ring-white/5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s)
                    if (s === 'read' && !finishedAtInput) setFinishedAtInput(toMonthInput(new Date()))
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition active:scale-[0.97] ${
                    status === s
                      ? `${STATUS_COLORS[s]} text-white shadow-lg`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {BOOK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Rating */}
          <div className="rounded-2xl bg-slate-800/40 px-4 py-4 ring-1 ring-white/5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ma note</p>
            {readOnly ? (
              rating !== null ? (
                <ReadOnlyStars rating={rating} />
              ) : (
                <p className="text-sm italic text-slate-600">Pas encore noté</p>
              )
            ) : (
              <div>
                <StarRating value={rating} onChange={setRating} />
                {rating !== null && (
                  <p className="mt-2 text-xs text-slate-500">
                    {rating} / 5 ·{' '}
                    <button onClick={() => setRating(null)} className="text-rose-400/70 transition hover:text-rose-400">
                      Effacer
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Journal de lecture */}
          {(status === 'reading' || status === 'read' || finishedAtInput) && (
            <div className="rounded-2xl bg-slate-800/40 px-4 py-4 ring-1 ring-white/5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Terminé en</p>
              {readOnly ? (
                <p className="text-sm font-medium text-slate-300">
                  {finishedAtInput ? formatMonthYear(fromMonthInput(finishedAtInput)) : '—'}
                </p>
              ) : (
                <input
                  type="month"
                  value={finishedAtInput}
                  onChange={(e) => setFinishedAtInput(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="block w-full min-w-0 max-w-full rounded-xl bg-slate-700/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/5 transition focus:ring-indigo-500/60"
                />
              )}
            </div>
          )}

          {/* Synopsis */}
          {book.description && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Synopsis</p>
              <p className={`text-sm leading-relaxed text-slate-400 ${showFullDesc ? '' : 'line-clamp-4'}`}>
                {book.description}
              </p>
              {book.description.length > 200 && (
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="mt-1.5 text-xs text-indigo-400 transition hover:text-indigo-300"
                >
                  {showFullDesc ? '↑ Voir moins' : '↓ Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* Notes personnelles */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Notes personnelles</p>
            {readOnly ? (
              <p className="text-sm leading-relaxed text-slate-400">
                {notes.trim() || <span className="italic text-slate-600">Aucune note</span>}
              </p>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tes impressions…"
                className="w-full resize-none rounded-2xl bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none ring-1 ring-white/5 transition focus:ring-indigo-500/50"
              />
            )}
          </div>

          {/* Citations */}
          {(!readOnly || quotes.length > 0) && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Citations</p>
              {quotes.length > 0 && (
                <div className="mb-3 space-y-2">
                  {quotes.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-800/40 px-4 py-3 ring-1 ring-white/5">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500/60">
                        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                      </svg>
                      <p className="flex-1 text-sm italic leading-relaxed text-slate-300">{q}</p>
                      {!readOnly && (
                        <button
                          onClick={() => setQuotes(quotes.filter((_, idx) => idx !== i))}
                          className="mt-0.5 shrink-0 text-slate-600 transition hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && (
                <div className="flex gap-2">
                  <input
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newQuote.trim()) {
                        setQuotes([...quotes, newQuote.trim()])
                        setNewQuote('')
                        e.preventDefault()
                      }
                    }}
                    placeholder="Ajouter une citation…"
                    className="flex-1 rounded-2xl bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none ring-1 ring-white/5 transition focus:ring-indigo-500/50"
                  />
                  <button
                    onClick={() => { if (newQuote.trim()) { setQuotes([...quotes, newQuote.trim()]); setNewQuote('') } }}
                    disabled={!newQuote.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400 ring-1 ring-white/5 transition hover:text-white disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
              {readOnly && quotes.length === 0 && (
                <p className="text-sm italic text-slate-700">Aucune citation enregistrée</p>
              )}
            </div>
          )}

          {/* Actions */}
          {!readOnly && (
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRecommend(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800/60 py-3 text-sm font-medium text-slate-300 ring-1 ring-white/5 transition hover:bg-slate-800 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                  Dans l'app
                </button>
                <button
                  onClick={() => void handleShare()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800/60 py-3 text-sm font-medium text-slate-300 ring-1 ring-white/5 transition hover:bg-slate-800 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Partager
                </button>
              </div>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`w-full rounded-2xl py-3 text-sm font-medium transition active:scale-[0.98] ${
                  confirmDelete
                    ? 'bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-600/30'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {isDeleting ? 'Suppression…' : confirmDelete ? '⚠ Confirmer la suppression' : 'Supprimer ce livre'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showRecommend && (
        <RecommendBookModal book={book} onClose={() => { setShowRecommend(false); onClose() }} />
      )}
    </div>
  )
}
