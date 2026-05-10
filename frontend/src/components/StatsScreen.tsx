import { useMemo, useState } from 'react'
import type { UserBook } from '../types/book'

interface StatsScreenProps {
  books: UserBook[]
  onClose: () => void
  onBookClick: (book: UserBook) => void
}

function formatReadingTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  if (h === 0) return `${Math.round(minutes)} min`
  if (h < 24) return `${h} h`
  const days = Math.floor(h / 24)
  return `${days} j ${h % 24} h`
}

function TopCover({ book, onClick }: { book: UserBook; onClick: () => void }) {
  const toHttps = (u: string) => u.replace('http://', 'https://')
  const [src, setSrc] = useState(toHttps(book.thumbnailUrl ?? book.coverUrl))
  const fallback = toHttps(book.thumbnailUrl ? book.coverUrl : '')
  return (
    <button onClick={onClick} className="shrink-0">
      <div className="h-28 w-[76px] overflow-hidden rounded-xl bg-slate-700 shadow-lg">
        {src ? (
          <img src={src} alt={book.title} className="h-full w-full object-cover"
            onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc('') }} />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-slate-500">
            {book.title}
          </div>
        )}
      </div>
    </button>
  )
}

export default function StatsScreen({ books, onClose, onBookClick }: StatsScreenProps) {
  const bookDate = (b: UserBook) =>
    b.finishedAt ? new Date(b.finishedAt) : b.createdAt ? new Date(b.createdAt) : null

  const availableYears = useMemo(() => {
    const years = new Set(
      books.map((b) => bookDate(b)?.getFullYear()).filter((y): y is number => y !== undefined),
    )
    return Array.from(years).sort((a, b) => b - a)
  }, [books])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const filtered = useMemo(
    () =>
      selectedYear === null
        ? books
        : books.filter((b) => bookDate(b)?.getFullYear() === selectedYear),
    [books, selectedYear],
  )

  const read = filtered.filter((b) => b.status === 'read')
  const pagesRead = read.filter((b) => b.pageCount).reduce((s, b) => s + (b.pageCount ?? 0), 0)
  const readingTimeMinutes = pagesRead * 1.5

  const ratedBooks = filtered.filter((b) => b.rating !== null)
  const avgRating = ratedBooks.length
    ? ratedBooks.reduce((s, b) => s + (b.rating ?? 0), 0) / ratedBooks.length
    : null

  const top5 = [...filtered]
    .filter((b) => b.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const b of filtered) {
    if (b.rating !== null) {
      // Bucket half-stars into nearest integer (3.5 → 4, 0.5 → 1, etc.)
      const bucket = Math.min(5, Math.max(1, Math.round(b.rating)))
      ratingCounts[bucket] = (ratingCounts[bucket] ?? 0) + 1
    }
  }
  const maxRatingCount = Math.max(...Object.values(ratingCounts), 1)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sm:pt-6">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Statistiques</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="space-y-6 px-4 sm:px-6">
          {/* Year filter */}
          {availableYears.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedYear(null)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedYear === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tout
              </button>
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    selectedYear === y
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900/80 via-slate-800 to-slate-800 p-5 ring-1 ring-indigo-800/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Livres lus</p>
                <p className="mt-1 text-4xl font-bold text-white">{read.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Temps de lecture</p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {pagesRead > 0 ? formatReadingTime(readingTimeMinutes) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Pages lues</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {pagesRead > 0 ? pagesRead.toLocaleString('fr-FR') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/70">Note moyenne</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {avgRating !== null ? `${avgRating.toFixed(1)}/5` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Top 5 */}
          {top5.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">
                Tes {top5.length === 1 ? 'livre préféré' : `${top5.length} livres préférés`}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {top5.map((book) => (
                  <TopCover key={book.id} book={book} onClick={() => onBookClick(book)} />
                ))}
              </div>
            </section>
          )}

          {/* Rating distribution */}
          {ratedBooks.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold text-white">
                Répartition des notes
              </h2>
              <div className="rounded-2xl bg-slate-800/60 p-4">
                <div className="flex items-end gap-2" style={{ height: '96px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const count = ratingCounts[star] ?? 0
                    const barH = maxRatingCount > 0
                      ? Math.round((count / maxRatingCount) * 72)
                      : 0
                    return (
                      <div key={star} className="flex flex-1 flex-col items-center justify-end gap-1">
                        {count > 0 && (
                          <span className="text-[10px] font-semibold text-slate-300">{count}</span>
                        )}
                        <div
                          className="w-full rounded-t-md bg-indigo-500"
                          style={{ height: `${Math.max(barH, 3)}px` }}
                        />
                        <span className="text-[10px] text-slate-500">{star}★</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* All time totals */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'À lire', value: filtered.filter((b) => b.status === 'to_read').length, color: 'text-slate-300' },
              { label: 'En cours', value: filtered.filter((b) => b.status === 'reading').length, color: 'text-indigo-400' },
              { label: 'Lus', value: read.length, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-slate-800/60 p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
