import { useMemo, useState, useRef, useEffect } from 'react'
import type { UserBook } from '../types/book'

type SortKey = 'date' | 'rating' | 'title' | 'author'

const SORT_OPTIONS: { key: SortKey; icon: string; label: string; shortLabel: string }[] = [
  { key: 'date',   icon: '📅', label: 'Date récente',  shortLabel: 'Date'   },
  { key: 'rating', icon: '⭐', label: 'Meilleure note', shortLabel: 'Note'   },
  { key: 'title',  icon: '🔤', label: 'Titre A→Z',     shortLabel: 'Titre'  },
  { key: 'author', icon: '✍️', label: 'Auteur A→Z',    shortLabel: 'Auteur' },
]

interface ReadTabProps {
  books: UserBook[]
  onBookClick: (book: UserBook) => void
  onShowStats: () => void
}

function BookRow({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-slate-800/50 px-4 py-3 text-left transition-all duration-150 hover:bg-slate-800/40 active:bg-slate-800/70 active:scale-[0.99]"
    >
      <div className="w-1 self-stretch shrink-0 rounded-full bg-emerald-500/60" />

      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-800 shadow-md">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] text-slate-600 px-0.5 text-center">
            {book.title}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{book.authors.join(', ')}</p>
        {book.rating !== null && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs text-amber-400">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</span>
            <span className="text-[10px] text-slate-600">{book.rating}/5</span>
          </div>
        )}
        {book.finishedAt && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Terminé le {new Date(book.finishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-slate-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export default function ReadTab({ books, onBookClick, onShowStats }: ReadTabProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date')
  const [showSort, setShowSort] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const readBooks = books.filter((b) => b.status === 'read')
  const total = readBooks.length

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!showSort) return
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSort])

  const grouped = useMemo(() => {
    const filtered = readBooks.filter((b) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return b.title.toLowerCase().includes(q) || b.authors.some((a) => a.toLowerCase().includes(q))
    })

    const dateOf = (b: UserBook) => (b.finishedAt ?? b.createdAt).getTime()

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'date') {
        return dateOf(b) - dateOf(a)
      }
      if (sort === 'rating') {
        const rDiff = (b.rating ?? -1) - (a.rating ?? -1)
        return rDiff !== 0 ? rDiff : dateOf(b) - dateOf(a)
      }
      if (sort === 'title') {
        return a.title.localeCompare(b.title, 'fr')
      }
      // author
      return (a.authors[0] ?? '').localeCompare(b.authors[0] ?? '', 'fr')
    })

    // Flat list (no month grouping) for title / author sorts
    if (sort === 'title' || sort === 'author') {
      return [{ label: null, items: sorted }]
    }

    // Grouped by month for date / rating sorts
    const map = new Map<string, UserBook[]>()
    for (const book of sorted) {
      const date = book.finishedAt ? new Date(book.finishedAt) : new Date(book.createdAt)
      const key = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(book)
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }, [readBooks, search, sort])

  const currentSortOption = SORT_OPTIONS.find((o) => o.key === sort)!

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-24">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-white">
            {total} livre{total > 1 ? 's' : ''} lus
          </h1>
          <div className="flex items-center gap-2">
            {/* Sort button */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setShowSort((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-slate-400 transition hover:text-white"
                aria-label="Trier"
              >
                <span className="text-sm">{currentSortOption.icon}</span>
                <span className="text-xs font-medium">{currentSortOption.shortLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showSort && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl bg-slate-800 ring-1 ring-white/10 shadow-xl overflow-hidden">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSort(opt.key); setShowSort(false) }}
                      className={`flex w-full items-center gap-2.5 px-4 py-3 text-sm text-left transition hover:bg-slate-700/60 ${sort === opt.key ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats button */}
            <button
              onClick={onShowStats}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-slate-400 transition hover:text-white"
              aria-label="Statistiques"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">Stats</span>
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 ring-1 ring-slate-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Recherche dans les ${total} livres lus`}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 || (grouped.length === 1 && grouped[0].items.length === 0) ? (
          <p className="py-12 text-center text-sm text-slate-600">
            {total === 0 ? "Aucun livre lu pour l'instant." : 'Aucun résultat'}
          </p>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label ?? '_flat'}>
              {label && (
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {label}
                </p>
              )}
              {items.map((book) => (
                <BookRow key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
