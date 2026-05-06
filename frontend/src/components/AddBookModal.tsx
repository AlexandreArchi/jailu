import { useState } from 'react'
import type { BookResult, BookStatus } from '../types/book'

interface AddBookModalProps {
  book: BookResult
  onConfirm: (status: BookStatus, finishedAt?: Date) => void
  onClose: () => void
}

function toInputDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function AddBookModal({ book, onConfirm, onClose }: AddBookModalProps) {
  const [step, setStep] = useState<'choose' | 'date'>('choose')
  const [dateInput, setDateInput] = useState(toInputDate(new Date()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={step === 'choose' ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-semibold text-white">{book.title}</p>
        <p className="mb-6 text-sm text-slate-400">{book.authors.join(', ')}</p>

        {step === 'choose' ? (
          <>
            <p className="mb-3 text-sm text-slate-300">Ajouter comme :</p>
            <div className="space-y-2">
              <button
                onClick={() => setStep('date')}
                className="w-full rounded-xl py-3 font-medium text-white transition bg-emerald-600 hover:bg-emerald-500"
              >
                Lu
              </button>
              <button
                onClick={() => onConfirm('reading')}
                className="w-full rounded-xl py-3 font-medium text-white transition bg-indigo-600 hover:bg-indigo-500"
              >
                En cours
              </button>
              <button
                onClick={() => onConfirm('to_read')}
                className="w-full rounded-xl py-3 font-medium text-white transition bg-slate-600 hover:bg-slate-500"
              >
                À lire
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-xl py-3 text-sm text-slate-400 hover:text-slate-200"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-300">Date de fin de lecture :</p>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              max={toInputDate(new Date())}
              className="w-full rounded-xl bg-slate-700 px-4 py-3 text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500 transition mb-4"
            />
            <button
              onClick={() => onConfirm('read', dateInput ? new Date(dateInput + 'T12:00:00') : new Date())}
              className="w-full rounded-xl py-3 font-medium text-white transition bg-emerald-600 hover:bg-emerald-500"
            >
              Ajouter comme lu
            </button>
            <button
              onClick={() => setStep('choose')}
              className="mt-2 w-full rounded-xl py-3 text-sm text-slate-400 hover:text-slate-200"
            >
              ← Retour
            </button>
          </>
        )}
      </div>
    </div>
  )
}
