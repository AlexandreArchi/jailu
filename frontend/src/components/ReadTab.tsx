import { useMemo, useState, useRef, useEffect } from 'react'
import type { UserBook } from '../types/book'
import { coverPalette } from '../lib/coverColor'

function MiniRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="flex items-center gap-px">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="text-xs leading-none text-amber-400">★</span>
      ))}
      {half && (
        <span className="relative inline-block text-xs leading-none">
          <span className="text-slate-600">★</span>
          <span className="absolute inset-0 text-amber-400" style={{ clipPath: 'inset(0 50% 0 0)' }}>★</span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-xs leading-none text-slate-700">★</span>
      ))}
    </span>
  )
}

type SortKey = 'date' | 'rating' | 'title' | 'author'
type ViewMode = 'list' | 'grid'

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

function BookRow({ book, onClick, showDate = false }: { book: UserBook; onClick: () => void; showDate?: boolean }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-slate-800/50 active:scale-[0.99] active:bg-slate-800/70"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-800 shadow-md">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center"
            style={{ background: coverPalette(book.title).bg }}>
            <span className="text-2xl font-bold opacity-70" style={{ color: coverPalette(book.title).fg }}>
              {book.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{book.authors.join(', ')}</p>
        <div className="mt-1 flex items-center gap-2">
          {book.rating !== null && <MiniRating rating={book.rating} />}
          {showDate && book.finishedAt && (
            <span className="text-[10px] text-slate-600">
              {new Date(book.finishedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-slate-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function GridCard({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')
  const palette = coverPalette(book.title)

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl bg-slate-800 shadow-md active:scale-95 transition-transform duration-150"
      style={{ aspectRatio: '2/3' }}
    >
      {src ? (
        <img src={src} alt={book.title} className="h-full w-full object-cover"
          onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ background: palette.bg }}>
          <span className="text-3xl font-bold opacity-70" style={{ color: palette.fg }}>
            {book.title[0]?.toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-1.5 pb-1.5 pt-6">
        <p className="text-[9px] font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
        {book.rating !== null && (
          <p className="text-[8px] text-amber-400 mt-0.5">{'★'.repeat(Math.floor(book.rating))}</p>
        )}
      </div>
    </button>
  )
}

export default function ReadTab({ books, onBookClick, onShowStats }: ReadTabProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date')
  const [view, setView] = useState<ViewMode>('list')
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

            {/* View toggle */}
            <button
              onClick={() => setView((v) => v === 'list' ? 'grid' : 'list')}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800 text-slate-400 transition hover:text-white"
              aria-label={view === 'list' ? 'Vue grille' : 'Vue liste'}
            >
              {view === 'list' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
            </button>

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
        ) : view === 'grid' ? (
          <div className="grid grid-cols-3 gap-2 px-4 py-2 sm:grid-cols-4">
            {grouped.flatMap(({ items }) => items).map((book) => (
              <GridCard key={book.id} book={book} onClick={() => onBookClick(book)} />
            ))}
          </div>
        ) : (
          <div className="px-2">
            {grouped.map(({ label, items }) => (
              <div key={label ?? '_flat'}>
                {label && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    {label}
                  </p>
                )}
                {items.map((book) => (
                  <BookRow key={book.id} book={book} onClick={() => onBookClick(book)} showDate={!label} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
