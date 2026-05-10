import { useState } from 'react'
import type { UserBook } from '../types/book'
import GoalBanner from './GoalBanner'
import SuggestionsSection from './SuggestionsSection'
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

interface HomeTabProps {
  books: UserBook[]
  isLoading: boolean
  displayName: string
  onBookClick: (book: UserBook) => void
  onGoToTab: (tab: 'to_read' | 'read') => void
  onShowStats: () => void
  onGoToSearch: () => void
  onBookAdded: () => void
  goal: { year: number; target: number } | null | undefined
  onGoalChange: (goal: { year: number; target: number } | null) => void
}

function CoverCard({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')

  return (
    <button
      onClick={onClick}
      className="shrink-0 group relative h-44 w-[104px] overflow-hidden rounded-2xl bg-slate-800 shadow-xl active:scale-95 transition-transform duration-150"
    >
      {src ? (
        <img
          src={src}
          alt={book.title}
          className="h-full w-full object-cover"
          onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1"
          style={{ background: coverPalette(book.title).bg }}>
          <span className="text-4xl font-bold opacity-70" style={{ color: coverPalette(book.title).fg }}>
            {book.title[0]?.toUpperCase()}
          </span>
        </div>
      )}
      {/* Gradient overlay with title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pb-2 pt-8">
        <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
      </div>
    </button>
  )
}

function LastReadItem({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-slate-800/50 active:scale-[0.99] active:bg-slate-800/70"
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-800 shadow-md">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800">
            <span className="text-lg font-bold opacity-60" style={{ color: '#a5b4fc' }}>
              {book.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{book.authors[0] ?? ''}</p>
        {book.finishedAt && (
          <p className="mt-0.5 text-[10px] text-slate-600">
            {new Date(book.finishedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
      {book.rating !== null && (
        <div className="shrink-0">
          <MiniRating rating={book.rating} />
        </div>
      )}
    </button>
  )
}

export default function HomeTab({ books, isLoading, displayName, onBookClick, onGoToTab, onShowStats, onGoToSearch, onBookAdded, goal, onGoalChange }: HomeTabProps) {
  const toRead = books.filter((b) => b.status === 'to_read')
  const reading = books.filter((b) => b.status === 'reading')
  const read = books.filter((b) => b.status === 'read')
  const currentYear = new Date().getFullYear()
  const readThisYear = read.filter((b) => (b.finishedAt ?? b.createdAt).getFullYear() === currentYear)
  const lastRead = [...read]
    .sort((a, b) => (b.finishedAt ?? b.createdAt).getTime() - (a.finishedAt ?? a.createdAt).getTime())
    .slice(0, 4)

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-7 px-4 pt-4 sm:px-6">
          <div className="skeleton h-20 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-32" />
            <div className="skeleton h-32" />
          </div>
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="flex gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-44 w-[104px] shrink-0" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-xl font-bold text-white">Bonjour {displayName}</p>
        <p className="mt-2 text-sm text-slate-400">Ta bibliothèque est vide.</p>
        <button
          onClick={onGoToSearch}
          className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
        >
          Ajouter mon premier livre
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* FAB */}
      <button
        onClick={onGoToSearch}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-2xl shadow-indigo-900/50 transition hover:bg-indigo-500 active:scale-95"
        aria-label="Ajouter un livre"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="space-y-7 px-4 pt-4 sm:px-6">
        {/* Reading goal banner */}
        <GoalBanner readCount={readThisYear.length} goal={goal} onGoalChange={onGoalChange} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onGoToTab('to_read')}
            className="rounded-3xl bg-gradient-to-br from-indigo-600/30 via-indigo-900/20 to-slate-900 p-5 text-left ring-1 ring-indigo-500/20 transition-all duration-200 hover:ring-indigo-500/40 active:scale-[0.97]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/80">À lire</p>
            <p className="mt-2 text-5xl font-bold tracking-tight text-white">{toRead.length + reading.length}</p>
            {reading.length > 0 && (
              <p className="mt-1.5 text-[10px] text-indigo-300/60">{reading.length} en cours</p>
            )}
          </button>
          <button
            onClick={onShowStats}
            className="rounded-3xl bg-gradient-to-br from-emerald-600/30 via-emerald-900/20 to-slate-900 p-5 text-left ring-1 ring-emerald-500/20 transition-all duration-200 hover:ring-emerald-500/40 active:scale-[0.97]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">Lus</p>
            <p className="mt-2 text-5xl font-bold tracking-tight text-white">{read.length}</p>
            <p className="mt-1.5 text-[10px] text-emerald-300/60">Voir les stats →</p>
          </button>
        </div>

        {/* En cours — au-dessus des suggestions pour un accès immédiat */}
        {reading.length > 0 && (
          <section>
            <SectionHeader label="En cours" count={reading.length} />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {reading.map((book) => (
                <CoverCard key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
        )}

        {/* À lire */}
        {toRead.length > 0 && (
          <section>
            <SectionHeader label="À lire" count={toRead.length} onAction={() => onGoToTab('to_read')} actionLabel="Tout voir" />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {toRead.slice(0, 12).map((book) => (
                <CoverCard key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
        )}

        {/* Suggestions — après les livres de l'utilisateur (chargement asynchrone) */}
        {read.length >= 1 && (
          <SuggestionsSection books={books} onBookAdded={onBookAdded} />
        )}

        {/* Derniers lus */}
        {lastRead.length > 0 && (
          <section>
            <SectionHeader label="Derniers lus" onAction={() => onGoToTab('read')} actionLabel="Tout voir" />
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

function SectionHeader({ label, count, onAction, actionLabel }: {
  label: string
  count?: number
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-white">{label}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">{count}</span>
        )}
      </div>
      {onAction && (
        <button onClick={onAction} className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
