import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getRecommendations, invalidateRecommendationsCache, type Suggestion } from '../lib/recommendations'
import { addBook } from '../lib/firestore'
import { getSuggestionReason } from '../lib/api'
import type { UserBook, BookStatus, BookResult } from '../types/book'
import AddBookModal from './AddBookModal'
import { coverPalette } from '../lib/coverColor'

// Module-level cache: googleBooksId → enriched reason (survives re-renders)
const _groqReasonCache = new Map<string, string>()

interface Props {
  books: UserBook[]
  onBookAdded: () => void
}

function SuggestionCard({ suggestion, onClick }: { suggestion: Suggestion; onClick: () => void }) {
  const { book, reason } = suggestion
  const [src, setSrc] = useState(book.cover_url || book.thumbnail_url || '')
  const fallback = book.thumbnail_url ?? ''

  return (
    <button
      onClick={onClick}
      className="shrink-0 group flex flex-col gap-2 w-[104px] active:scale-95 transition-transform duration-150 text-left"
    >
      {/* Cover */}
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-800 shadow-xl">
        {src ? (
          <img
            src={src}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1 p-2"
            style={{ background: coverPalette(book.title).bg }}
          >
            <span className="text-4xl font-bold opacity-70" style={{ color: coverPalette(book.title).fg }}>
              {book.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Gradient + title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pb-2 pt-8">
          <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
        </div>
        {/* Add badge */}
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/90 opacity-0 group-active:opacity-100 transition-opacity">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
      {/* Reason */}
      <p className="text-[10px] leading-tight text-slate-500 line-clamp-2">{reason}</p>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="shrink-0 w-[104px] space-y-2">
      <div className="skeleton h-44 w-full rounded-2xl" />
      <div className="skeleton h-3 w-3/4 rounded" />
    </div>
  )
}

export default function SuggestionsSection({ books, onBookAdded }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [selected, setSelected] = useState<BookResult | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const fetchedFor = useRef<string>('')
  const enrichedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const key = books.map((b) => b.id).sort().join(',')
    if (fetchedFor.current === key) return
    fetchedFor.current = key

    setStatus('loading')
    getRecommendations(books)
      .then((s) => {
        // Apply cached Groq reasons immediately if available
        const withCached = s.map((sug) => ({
          ...sug,
          reason: _groqReasonCache.get(sug.book.google_books_id) ?? sug.reason,
        }))
        setSuggestions(withCached)
        setStatus(s.length > 0 ? 'ready' : 'empty')
      })
      .catch(() => setStatus('empty'))
  }, [books])

  // Enrich reasons with Groq in the background
  useEffect(() => {
    if (status !== 'ready' || suggestions.length === 0) return

    const toEnrich = suggestions.filter(
      (s) => !enrichedIds.current.has(s.book.google_books_id) && !_groqReasonCache.has(s.book.google_books_id),
    )
    if (toEnrich.length === 0) return

    toEnrich.forEach((s) => enrichedIds.current.add(s.book.google_books_id))

    void Promise.allSettled(
      toEnrich.map(async (s) => {
        const reason = await getSuggestionReason({
          sourceTitle: s.sourceTitle,
          sourceAuthor: s.sourceAuthor,
          suggestedTitle: s.book.title,
          suggestedAuthor: s.book.authors[0] ?? '',
          suggestedDescription: s.book.description,
        })
        if (reason) {
          _groqReasonCache.set(s.book.google_books_id, reason)
          setSuggestions((prev) =>
            prev.map((sug) =>
              sug.book.google_books_id === s.book.google_books_id ? { ...sug, reason } : sug,
            ),
          )
        }
      }),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleConfirm = async (status: BookStatus, finishedAt?: Date) => {
    if (!selected) return
    setIsAdding(true)
    try {
      await addBook(selected, status, finishedAt)
      invalidateRecommendationsCache()
      setSuggestions((prev) => prev.filter((s) => s.book.google_books_id !== selected.google_books_id))
      setSelected(null)
      onBookAdded()
    } finally {
      setIsAdding(false)
    }
  }

  if (status === 'empty') return null

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">✨</span>
        <h2 className="text-base font-bold text-white">Suggestions pour toi</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
