import { useEffect, useState } from 'react'
import { getFriendBooks } from '../lib/firestore'
import type { FriendEntry, UserBook } from '../types/book'

interface Props {
  friend: FriendEntry
  onClose: () => void
}

function CoverItem({ book }: { book: UserBook }) {
  const toHttps = (u: string) => u.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800/50">
      <div className="w-1 self-stretch shrink-0 rounded-full bg-emerald-500/60" />
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800 shadow">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] text-slate-600 px-0.5 text-center">{book.title}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{book.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{book.authors.join(', ')}</p>
        {book.rating !== null && (
          <p className="mt-0.5 text-xs text-amber-400">
            {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
          </p>
        )}
      </div>
    </div>
  )
}

function ReadingItem({ book }: { book: UserBook }) {
  const toHttps = (u: string) => u.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ?? '')

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/50 px-3 py-3 ring-1 ring-white/5">
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
    </div>
  )
}

export default function FriendLibraryScreen({ friend, onClose }: Props) {
  const [books, setBooks] = useState<UserBook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getFriendBooks(friend.uid)
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setIsLoading(false))
  }, [friend.uid])

  const read = books.filter((b) => b.status === 'read')
  const reading = books.filter((b) => b.status === 'reading')
  const pagesRead = read.filter((b) => b.pageCount).reduce((s, b) => s + (b.pageCount ?? 0), 0)
  const ratedBooks = read.filter((b) => b.rating !== null)
  const avgRating = ratedBooks.length
    ? (ratedBooks.reduce((s, b) => s + (b.rating ?? 0), 0) / ratedBooks.length).toFixed(1)
    : null

  const grouped: { label: string; items: UserBook[] }[] = []
  for (const book of read) {
    const date = book.finishedAt ? new Date(book.finishedAt) : new Date(book.createdAt)
    const key = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const existing = grouped.find((g) => g.label === key)
    if (existing) existing.items.push(book)
    else grouped.push({ label: key, items: [book] })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sm:pt-6">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">@{friend.username}</h1>
          <p className="text-xs text-slate-500">Ami depuis le {friend.since.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="space-y-6 px-4 sm:px-6">
            {/* Stats */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-900/80 via-slate-800 to-slate-800 p-5 ring-1 ring-indigo-800/30">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Lus</p>
                  <p className="mt-1 text-3xl font-bold text-white">{read.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Pages</p>
                  <p className="mt-1 text-3xl font-bold text-white">
                    {pagesRead > 0 ? (pagesRead >= 1000 ? `${Math.round(pagesRead / 1000)}k` : pagesRead) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Note moy.</p>
                  <p className="mt-1 text-3xl font-bold text-white">{avgRating ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* En cours */}
            {reading.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white">En cours</h2>
                <div className="space-y-2">
                  {reading.map((b) => <ReadingItem key={b.id} book={b} />)}
                </div>
              </section>
            )}

            {/* Livres lus */}
            {grouped.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-600">Aucun livre lu pour l'instant.</p>
            ) : (
              grouped.map(({ label, items }) => (
                <section key={label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
                  {items.map((b) => <CoverItem key={b.id} book={b} />)}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
