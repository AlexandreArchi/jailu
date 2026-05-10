import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getRecommendations, invalidateRecommendationsCache, type Suggestion } from '../lib/recommendations'
import { addBook } from '../lib/firestore'
import type { UserBook, BookStatus, BookResult } from '../types/book'
import AddBookModal from './AddBookModal'
import { coverPalette } from '../lib/coverColor'

interface Props {
  books: UserBook[]
  onBookAdded: () => void
}

function SuggestionCard({ suggestion, onClick }: { suggestion: Suggestion; onClick: () => void }) {
  const { book, reason } = suggestion
  const [src, setSrc] = useState(book.cover_url || book.thumbnail_url || '')
  const fallback = book.thumbnail_url ?? ''
  const palette = coverPalette(book.title)

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-stretch gap-3 rounded-2xl bg-slate-800/60 p-3 active:scale-[0.98] transition-transform duration-150 text-left"
    >
      {/* Cover — left */}
      <div className="shrink-0 w-16 h-24 rounded-xl overflow-hidden shadow-lg">
        {src ? (
          <img
            src={src}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: palette.bg }}
          >
            <span className="text-2xl font-bold opacity-70" style={{ color: palette.fg }}>
              {book.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Text — right */}
      <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
        {book.authors?.[0] && (
          <p className="text-xs text-slate-400 truncate">{book.authors[0]}</p>
        )}
        {reason && (
          <p className="text-xs leading-snug text-slate-300 line-clamp-3 mt-0.5">{reason}</p>
        )}
      </div>

      {/* Add chevron */}
      <div className="shrink-0 self-center text-slate-500 group-active:text-indigo-400 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full flex items-center gap-3 rounded-2xl bg-slate-800/60 p-3">
      <div className="skeleton shrink-0 w-16 h-24 rounded-xl" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-full rounded mt-1" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
    </div>
  )
}

export default function SuggestionsSection({ books, onBookAdded }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [selected, setSelected] = useState<BookResult | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const fetchedFor = useRef<string>('')

  useEffect(() => {
    const key = books.map((b) => b.id).sort().join(',')
    if (fetchedFor.current === key) return

    setStatus('loading')
    getRecommendations(books)
      .then((s) => {
        fetchedFor.current = key  // marquer seulement en cas de succès
        setSuggestions(s)
        setStatus(s.length > 0 ? 'ready' : 'empty')
      })
      .catch(() => {
        // Ne pas marquer fetchedFor → permet un retry si books change
        setStatus('empty')
      })
  }, [books])

  const handleConfirm = async (status: BookStatus, finishedAt?: Date) => {
    if (!selected) return
    setIsAdding(true)
    try {
      await addBook(selected, status, finishedAt)
      invalidateRecommendationsCache()
      setSuggestions((prev) => prev.filter((s) => s.book.google_books_id !== selected.google_books_id))
      setSelected(null)
      onBookAdded()
    } catch {
      // keep modal open on error so user can retry
    } finally {
      setIsAdding(false)
    }
  }

  if (status === 'empty') return null

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">✨</span>
        <h2 className="text-base font-bold text-white">Suggestions du jour selon tes goûts</h2>
      </div>

      <div className="flex flex-col gap-2">
        {status === 'loading'
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : suggestions.map((s) => (
              <SuggestionCard
                key={s.book.google_books_id}
                suggestion={s}
                onClick={() => setSelected(s.book)}
              />
            ))}
      </div>

      {selected !== null &&
        createPortal(
          <AddBookModal
            book={selected}
            onConfirm={isAdding ? () => undefined : handleConfirm}
            onClose={() => setSelected(null)}
          />,
          document.body,
        )}
    </section>
  )
}
