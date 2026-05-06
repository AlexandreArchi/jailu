import { useState } from 'react'
import { updateBook, deleteBook } from '../lib/firestore'
import { BOOK_STATUS_LABELS, type BookStatus, type UserBook } from '../types/book'

interface BookDetailModalProps {
  book: UserBook
  onClose: () => void
  onUpdated: () => void
}

const STATUSES: BookStatus[] = ['read', 'reading', 'to_read']

function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(value === star ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="text-2xl transition"
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >
          <span className={star <= display ? 'text-amber-400' : 'text-slate-600'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function BookDetailModal({ book, onClose, onUpdated }: BookDetailModalProps) {
  const [status, setStatus] = useState<BookStatus>(book.status)
  const [rating, setRating] = useState<number | null>(book.rating)
  const [notes, setNotes] = useState(book.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const year = book.publishedDate?.split('-')[0]
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [coverSrc, setCoverSrc] = useState(toHttps(book.coverUrl))
  const fallbackSrc = toHttps(book.thumbnailUrl ?? '')

  const handleSave = async () => {
    setIsSaving(true)
    await updateBook(book.id, { status, rating, notes: notes.trim() || null })
    setIsSaving(false)
    onUpdated()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsDeleting(true)
    await deleteBook(book.id)
    onUpdated()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête livre */}
        <div className="flex gap-3 bg-slate-700 p-4">
          {coverSrc && (
            <img
              src={coverSrc}
              alt={book.title}
              className="h-20 w-14 rounded-md object-cover shrink-0"
              onError={() => {
                if (coverSrc !== fallbackSrc && fallbackSrc) setCoverSrc(fallbackSrc)
                else setCoverSrc('')
              }}
            />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white leading-tight">{book.title}</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {book.authors.join(', ')}
              {year ? ` · ${year}` : ''}
            </p>
            {book.pageCount && (
              <p className="mt-0.5 text-xs text-slate-500">{book.pageCount} pages</p>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4">
          {/* Statut */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Statut
            </p>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    status === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {BOOK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Note
            </p>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notes texte */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes personnelles
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tes impressions..."
              className="w-full resize-none rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`w-full rounded-xl py-3 text-sm font-medium transition ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'text-red-400 hover:text-red-300'
            }`}
          >
            {isDeleting ? 'Suppression...' : confirmDelete ? 'Confirmer la suppression' : 'Supprimer ce livre'}
          </button>
        </div>
      </div>
    </div>
  )
}
