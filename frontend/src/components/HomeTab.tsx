import { useState } from 'react'
import type { UserBook } from '../types/book'

interface HomeTabProps {
  books: UserBook[]
  isLoading: boolean
  displayName: string
  onBookClick: (book: UserBook) => void
  onGoToTab: (tab: 'to_read' | 'read') => void
  onShowStats: () => void
  onSignOut: () => void
}

function CoverThumb({
  book,
  onClick,
  size = 'md',
}: {
  book: UserBook
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')

  const dims = size === 'sm' ? 'h-24 w-16' : 'h-32 w-22'

  return (
    <button onClick={onClick} className="shrink-0 flex flex-col gap-1.5">
      <div className={`${dims} overflow-hidden rounded-xl bg-slate-800 shadow-lg`}>
        {src ? (
          <img
            src={src}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={() => {
              if (src !== fallback && fallback) setSrc(fallback)
              else setSrc('')
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-slate-600">
            {book.title}
          </div>
        )}
      </div>
      <p className="w-16 truncate text-center text-[10px] text-slate-400 leading-tight">
        {book.title}
      </p>
    </button>
  )
}

export default function HomeTab({
  books,
  isLoading,
  displayName,
  onBookClick,
  onGoToTab,
  onShowStats,
  onSignOut,
}: HomeTabProps) {
  const toRead = books.filter((b) => b.status === 'to_read')
  const reading = books.filter((b) => b.status === 'reading')
  const read = books.filter((b) => b.status === 'read')
  const lastRead = read.slice(0, 4)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-bold text-white">Bonjour {displayName} 👋</p>
        <p className="mt-2 text-slate-400">Ta bibliothèque est vide.</p>
        <p className="text-slate-500 text-sm mt-1">Tape dans Recherche pour ajouter ton premier livre.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="space-y-6 px-4 pt-4 sm:px-6">
        {/* Résumé cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onGoToTab('to_read')}
            className="rounded-2xl bg-gradient-to-br from-indigo-900/60 to-slate-800 p-4 text-left ring-1 ring-slate-700/50 transition hover:ring-indigo-700/50"
          >
            <p className="text-xs font-medium text-slate-400">À lire{reading.length > 0 ? ` · ${reading.length} en cours` : ''}</p>
            <p className="mt-1 text-4xl font-bold text-white">{toRead.length + reading.length}</p>
          </button>
          <button
            onClick={onShowStats}
            className="rounded-2xl bg-gradient-to-br from-emerald-900/60 to-slate-800 p-4 text-left ring-1 ring-slate-700/50 transition hover:ring-emerald-700/50"
          >
            <p className="text-xs font-medium text-slate-400">Livres lus</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-4xl font-bold text-white">{read.length}</p>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mb-1 h-5 w-5 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </button>
        </div>

        {/* En cours */}
        {reading.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">En cours</h2>
              <span className="text-xs text-slate-500">{reading.length} livre{reading.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {reading.map((book) => (
                <CoverThumb key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
        )}

        {/* À lire */}
        {toRead.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">À lire</h2>
              <button
                onClick={() => onGoToTab('to_read')}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Afficher tout
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {toRead.slice(0, 10).map((book) => (
                <CoverThumb key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
        )}

        {/* Derniers lus */}
        {lastRead.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Derniers lus</h2>
              <button
                onClick={() => onGoToTab('read')}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Afficher tout
              </button>
            </div>
            <div className="space-y-2">
              {lastRead.map((book) => (
                <LastReadItem key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LastReadItem({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2.5 text-left transition hover:bg-slate-800 active:bg-slate-700"
    >
      <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md bg-slate-700">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="h-full w-full bg-slate-700" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500">{book.authors[0] ?? ''}</p>
      </div>
      {book.rating !== null && (
        <p className="shrink-0 text-xs text-amber-400">{'★'.repeat(book.rating)}</p>
      )}
    </button>
  )
}
