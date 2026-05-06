import { useMemo, useState } from 'react'
import type { UserBook } from '../types/book'

interface ReadTabProps {
  books: UserBook[]
  onBookClick: (book: UserBook) => void
  onShowStats: () => void
}

function BookRow({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')
  const day = book.createdAt ? new Date(book.createdAt).getDate() : null

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-slate-800/60 px-4 py-3 text-left transition hover:bg-slate-800/40 active:bg-slate-800"
    >
      <div className="w-6 shrink-0 text-center">
        {day !== null && (
          <span className="text-sm font-semibold text-slate-600">{day}</span>
        )}
      </div>

      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800 shadow">
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
          <p className="mt-1 text-xs text-amber-400">
            {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
            <span className="ml-1 text-slate-500">{book.rating}/5</span>
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

  const readBooks = books.filter((b) => b.status === 'read')
  const total = readBooks.length

  const grouped = useMemo(() => {
    const filtered = readBooks.filter((b) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return b.title.toLowerCase().includes(q) || b.authors.some((a) => a.toLowerCase().includes(q))
    })

    const map = new Map<string, UserBook[]>()
    for (const book of filtered) {
      const date = book.finishedAt ? new Date(book.finishedAt) : book.createdAt ? new Date(book.createdAt) : new Date()
      const key = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(book)
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }, [readBooks, search])

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            {total} livre{total > 1 ? 's' : ''} lus
          </h1>
          <button
            onClick={onShowStats}
            className="rounded-xl bg-slate-800 p-2 text-slate-400 transition hover:text-white"
            aria-label="Statistiques"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
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
        {grouped.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">
            {total === 0 ? 'Aucun livre lu pour l\'instant.' : 'Aucun résultat'}
          </p>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {label}
              </p>
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
