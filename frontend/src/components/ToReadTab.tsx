import { useState } from 'react'
import type { UserBook } from '../types/book'

interface ToReadTabProps {
  books: UserBook[]
  onBookClick: (book: UserBook) => void
}

const STATUS_BADGE: Record<string, string> = {
  reading: 'bg-indigo-500/20 text-indigo-300',
  to_read: 'bg-slate-700 text-slate-400',
}
const STATUS_LABEL: Record<string, string> = {
  reading: 'En cours',
  to_read: 'À lire',
}

const ACCENT: Record<string, string> = { reading: 'bg-indigo-500', to_read: 'bg-slate-700', read: 'bg-emerald-500' }

function BookRow({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')

  const dateAdded = book.createdAt
    ? new Date(book.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-slate-800/50 px-4 py-3 text-left transition-all duration-150 hover:bg-slate-800/40 active:bg-slate-800/70 active:scale-[0.99]"
    >
      <div className={`w-1 self-stretch shrink-0 rounded-full ${ACCENT[book.status]}`} />
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
        {dateAdded && (
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Ajouté le {dateAdded}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[book.status]}`}>
          {STATUS_LABEL[book.status]}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

export default function ToReadTab({ books, onBookClick }: ToReadTabProps) {
  const [search, setSearch] = useState('')

  const filtered = books
    .filter((b) => b.status === 'to_read' || b.status === 'reading')
    .filter((b) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return b.title.toLowerCase().includes(q) || b.authors.some((a) => a.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (a.status === 'reading' && b.status !== 'reading') return -1
      if (b.status === 'reading' && a.status !== 'reading') return 1
      return 0
    })

  const total = books.filter((b) => b.status === 'to_read' || b.status === 'reading').length

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <h1 className="text-lg font-bold text-white">
          {total} livre{total > 1 ? 's' : ''} à lire
        </h1>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 ring-1 ring-slate-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Recherche dans les ${total} livres`}
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
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">Aucun résultat</p>
        ) : (
          filtered.map((book) => (
            <BookRow key={book.id} book={book} onClick={() => onBookClick(book)} />
          ))
        )}
      </div>
    </div>
  )
}
