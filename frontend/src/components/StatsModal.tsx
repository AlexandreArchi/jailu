import type { UserBook } from '../types/book'

interface StatsModalProps {
  books: UserBook[]
  onClose: () => void
}

export default function StatsModal({ books, onClose }: StatsModalProps) {
  const total = books.length
  const read = books.filter((b) => b.status === 'read').length
  const reading = books.filter((b) => b.status === 'reading').length
  const toRead = books.filter((b) => b.status === 'to_read').length

  const pagesRead = books
    .filter((b) => b.status === 'read' && b.pageCount)
    .reduce((sum, b) => sum + (b.pageCount ?? 0), 0)

  const ratedBooks = books.filter((b) => b.rating !== null)
  const avgRating = ratedBooks.length
    ? ratedBooks.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratedBooks.length
    : null

  const thisYear = new Date().getFullYear()
  const booksThisYear = books.filter(
    (b) => b.createdAt && new Date(b.createdAt).getFullYear() === thisYear,
  ).length

  const statRows = [
    { label: 'Lu', count: read, color: 'bg-emerald-500' },
    { label: 'En cours', count: reading, color: 'bg-indigo-500' },
    { label: 'À lire', count: toRead, color: 'bg-slate-500' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <p className="font-semibold text-white">Statistiques</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-5 p-4">
          {/* Chiffres clés */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-700 p-3 text-center">
              <p className="text-3xl font-bold text-white">{total}</p>
              <p className="mt-0.5 text-xs text-slate-400">livre{total > 1 ? 's' : ''} au total</p>
            </div>
            <div className="rounded-xl bg-slate-700 p-3 text-center">
              <p className="text-3xl font-bold text-emerald-400">{read}</p>
              <p className="mt-0.5 text-xs text-slate-400">lu{read > 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-xl bg-slate-700 p-3 text-center">
              <p className="text-3xl font-bold text-white">
                {pagesRead > 0 ? pagesRead.toLocaleString('fr-FR') : '—'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">pages lues</p>
            </div>
            <div className="rounded-xl bg-slate-700 p-3 text-center">
              <p className="text-3xl font-bold text-amber-400">
                {avgRating !== null ? avgRating.toFixed(1) : '—'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">note moyenne</p>
            </div>
          </div>

          {/* Répartition */}
          {total > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Répartition
              </p>
              <div className="space-y-2">
                {statRows.map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <p className="w-16 text-xs text-slate-400">{label}</p>
                    <div className="flex-1 rounded-full bg-slate-700 h-2">
                      <div
                        className={`h-2 rounded-full ${color} transition-all`}
                        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="w-5 text-right text-xs text-slate-300">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cette année */}
          <div className="rounded-xl bg-slate-700 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-slate-300">Ajoutés en {thisYear}</p>
            <p className="text-lg font-bold text-white">{booksThisYear}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
