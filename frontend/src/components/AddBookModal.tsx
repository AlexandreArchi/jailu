import type { BookResult, BookStatus } from '../types/book'

interface AddBookModalProps {
  book: BookResult
  onConfirm: (status: BookStatus) => void
  onClose: () => void
}

const OPTIONS: { status: BookStatus; label: string; color: string }[] = [
  { status: 'read', label: 'Lu', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { status: 'reading', label: 'En cours', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { status: 'to_read', label: 'À lire', color: 'bg-slate-600 hover:bg-slate-500' },
]

export default function AddBookModal({ book, onConfirm, onClose }: AddBookModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-semibold text-white">{book.title}</p>
        <p className="mb-6 text-sm text-slate-400">
          {book.authors.join(', ')}
        </p>
        <p className="mb-3 text-sm text-slate-300">Ajouter comme :</p>
        <div className="space-y-2">
          {OPTIONS.map(({ status, label, color }) => (
            <button
              key={status}
              onClick={() => onConfirm(status)}
              className={`w-full rounded-xl py-3 font-medium text-white transition ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl py-3 text-sm text-slate-400 hover:text-slate-200"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
