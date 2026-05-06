import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from '../lib/firebase'
import { updateBook, deleteBook, updateBookCover, createStory } from '../lib/firestore'
import { BOOK_STATUS_LABELS, type BookStatus, type UserBook } from '../types/book'
import RecommendBookModal from './RecommendBookModal'

interface BookDetailModalProps {
  book: UserBook
  onClose: () => void
  onUpdated: () => void
  readOnly?: boolean
}

const STATUSES: BookStatus[] = ['read', 'reading', 'to_read']

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative h-8 w-8" onMouseLeave={() => setHovered(null)}>
            <span className="absolute inset-0 flex items-center justify-center text-2xl text-slate-600">★</span>
            <span
              className="absolute inset-0 flex items-center justify-center text-2xl text-amber-400"
              style={{
                opacity: full || half ? 1 : 0,
                clipPath: half ? 'inset(0 50% 0 0)' : undefined,
              }}
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

function toInputDate(d: Date | null): string {
  if (!d) return ''
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromInputDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function readingDays(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)))
}

export default function BookDetailModal({ book, onClose, onUpdated, readOnly = false }: BookDetailModalProps) {
  const [status, setStatus] = useState<BookStatus>(book.status)
  const [rating, setRating] = useState<number | null>(book.rating)
  const [notes, setNotes] = useState(book.notes ?? '')
  const [startedAtInput, setStartedAtInput] = useState(toInputDate(book.startedAt))
  const [finishedAtInput, setFinishedAtInput] = useState(toInputDate(book.finishedAt))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const coverFileRef = useRef<HTMLInputElement>(null)

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

  const year = book.publishedDate?.split('-')[0]
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [coverSrc, setCoverSrc] = useState(toHttps(book.coverUrl))
  const fallbackSrc = toHttps(book.thumbnailUrl ?? '')

  const startedAt = fromInputDate(startedAtInput)
  const finishedAt = fromInputDate(finishedAtInput)

  const handleSave = async () => {
    setIsSaving(true)
    const extra: { startedAt?: Date | null; finishedAt?: Date | null } = {
      startedAt: startedAt,
      finishedAt: finishedAt,
    }
    // Auto-set si vide et statut cohérent
    if (!startedAt && status === 'reading') extra.startedAt = new Date()
    if (!finishedAt && status === 'read') extra.finishedAt = new Date()
    await updateBook(book.id, { status, rating, notes: notes.trim() || null, ...extra })
    if (status === 'read' && book.status !== 'read') {
      void createStory(
        { title: book.title, authors: book.authors, coverUrl: book.coverUrl, thumbnailUrl: book.thumbnailUrl, googleBooksId: book.googleBooksId },
        rating,
      )
    }
    setIsSaving(false)
    onUpdated()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setIsDeleting(true)
    await deleteBook(book.id)
    onUpdated()
    onClose()
  }

  const days = readingDays(startedAt, finishedAt)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-3 pt-3">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 transition hover:bg-slate-600 hover:text-white"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-3 bg-slate-700 p-4">
          {/* Cover — cliquable pour changer/ajouter si pas readOnly */}
          <div className="relative shrink-0">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={book.title}
                className="h-20 w-14 rounded-md object-cover"
                onError={() => { if (coverSrc !== fallbackSrc && fallbackSrc) setCoverSrc(fallbackSrc); else setCoverSrc('') }}
              />
            ) : (
              !readOnly && (
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  className="flex h-20 w-14 flex-col items-center justify-center gap-1 rounded-md bg-slate-600 ring-1 ring-dashed ring-slate-500 hover:ring-indigo-400 transition text-slate-400"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[9px] text-center leading-tight px-0.5">Ajouter</span>
                </button>
              )
            )}
            {!readOnly && coverSrc && (
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-slate-300 hover:text-white transition"
                aria-label="Changer la couverture"
              >
                {isUploadingCover ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-white" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
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
          <div className="min-w-0 flex-1">

            <p className="font-semibold text-white leading-tight">{book.title}</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {book.authors.join(', ')}{year ? ` · ${year}` : ''}
            </p>
            {book.pageCount && (
              <p className="mt-0.5 text-xs text-slate-500">{book.pageCount} pages</p>
            )}
            {book.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {book.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-600/60 px-2 py-0.5 text-[10px] text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4 overflow-y-auto">
          {/* Dates de lecture */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dates de lecture</p>
            {readOnly ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-700/50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 mb-0.5">Commencé le</p>
                  <p className="text-sm text-white">{startedAtInput ? new Date(startedAtInput).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <div className="rounded-lg bg-slate-700/50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 mb-0.5">Terminé le</p>
                  <p className="text-sm text-white">{finishedAtInput ? new Date(finishedAtInput).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-slate-500">Commencé le</label>
                  <input
                    type="date"
                    value={startedAtInput}
                    onChange={(e) => setStartedAtInput(e.target.value)}
                    className="w-full rounded-lg bg-slate-700 px-2 py-1.5 text-sm text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-500">Terminé le</label>
                  <input
                    type="date"
                    value={finishedAtInput}
                    onChange={(e) => setFinishedAtInput(e.target.value)}
                    className="w-full rounded-lg bg-slate-700 px-2 py-1.5 text-sm text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
            {days !== null && (
              <p className="text-xs font-medium text-indigo-400">{days} jour{days > 1 ? 's' : ''} de lecture</p>
            )}
          </div>

          {/* Statut */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Statut</p>
            {readOnly ? (
              <span className="inline-block rounded-lg bg-indigo-600/20 px-3 py-1.5 text-sm font-medium text-indigo-300">
                {BOOK_STATUS_LABELS[status]}
              </span>
            ) : (
              <div className="flex gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s)
                      if (s === 'read' && !finishedAtInput) setFinishedAtInput(toInputDate(new Date()))
                      if (s === 'reading' && !startedAtInput) setStartedAtInput(toInputDate(new Date()))
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      status === s ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {BOOK_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Note</p>
            {readOnly ? (
              rating !== null ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const full = (rating ?? 0) >= star
                      const half = !full && (rating ?? 0) >= star - 0.5
                      return (
                        <span key={star} className="relative text-xl">
                          <span className="text-slate-600">★</span>
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
                  <span className="text-sm text-slate-400">{rating}/5</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Pas encore noté</p>
              )
            ) : (
              <StarRating value={rating} onChange={setRating} />
            )}
          </div>

          {/* Synopsis */}
          {book.description && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Synopsis</p>
              <p className={`text-sm text-slate-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                {book.description}
              </p>
              {book.description.length > 150 && (
                <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-1 text-xs text-indigo-400 hover:text-indigo-300">
                  {showFullDesc ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* Notes texte */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Notes personnelles</p>
            {readOnly ? (
              <p className="text-sm text-slate-300 leading-relaxed">
                {notes.trim() || <span className="text-slate-500 italic">Aucune note</span>}
              </p>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tes impressions..."
                className="w-full resize-none rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
              />
            )}
          </div>

          {!readOnly && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>

              <button
                onClick={() => setShowRecommend(true)}
                className="w-full rounded-xl bg-slate-700 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-600 hover:text-white"
              >
                Recommander à un ami
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`w-full rounded-xl py-3 text-sm font-medium transition ${
                  confirmDelete ? 'bg-red-600 text-white hover:bg-red-500' : 'text-red-400 hover:text-red-300'
                }`}
              >
                {isDeleting ? 'Suppression...' : confirmDelete ? 'Confirmer la suppression' : 'Supprimer ce livre'}
              </button>
            </>
          )}
          {showRecommend && (
            <RecommendBookModal book={book} onClose={() => { setShowRecommend(false); onClose() }} />
          )}
        </div>
      </div>
    </div>
  )
}
