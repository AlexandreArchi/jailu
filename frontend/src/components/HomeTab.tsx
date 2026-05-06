import { useState } from 'react'
import type { UserBook } from '../types/book'
import GoalBanner from './GoalBanner'

interface HomeTabProps {
  books: UserBook[]
  isLoading: boolean
  displayName: string
  onBookClick: (book: UserBook) => void
  onGoToTab: (tab: 'to_read' | 'read') => void
  onShowStats: () => void
  onGoToSearch: () => void
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
        <div className="flex h-full items-center justify-center p-2 text-center text-[9px] text-slate-500 bg-slate-800">
          {book.title}
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
      className="flex w-full items-center gap-3 rounded-2xl bg-slate-800/50 px-3 py-3 text-left ring-1 ring-white/5 transition-all duration-150 hover:bg-slate-800 hover:ring-white/10 active:scale-[0.98]"
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-700 shadow-md">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="h-full w-full bg-slate-700" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{book.authors[0] ?? ''}</p>
      </div>
      {book.rating !== null && (
        <div className="shrink-0 flex items-center gap-0.5">
          <span className="text-amber-400 text-sm">★</span>
          <span className="text-xs font-semibold text-amber-400">{book.rating}</span>
        </div>
      )}
    </button>
  )
}

export default function HomeTab({ books, isLoading, displayName, onBookClick, onGoToTab, onShowStats, onGoToSearch, goal, onGoalChange }: HomeTabProps) {
  const toRead = books.filter((b) => b.status === 'to_read')
  const reading = books.filter((b) => b.status === 'reading')
  const read = books.filter((b) => b.status === 'read')
  const lastRead = [...read]
    .sort((a, b) => (b.finishedAt ?? b.createdAt).getTime() - (a.finishedAt ?? a.createdAt).getTime())
    .slice(0, 4)

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
    <div className="flex-1 overflow-y-auto pb-28">
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

      <div className="space-y-7 px-4 pt-5 sm:px-6">
        {/* Reading goal banner */}
        <GoalBanner readCount={read.length} goal={goal} onGoalChange={onGoalChange} />

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

        {/* En cours */}
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
            <SectionHeader label="À lire" onAction={() => onGoToTab('to_read')} actionLabel="Tout voir" />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {toRead.slice(0, 12).map((book) => (
                <CoverCard key={book.id} book={book} onClick={() => onBookClick(book)} />
              ))}
            </div>
          </section>
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
