import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from '../lib/firebase'
import { addManualBook } from '../lib/firestore'
import type { BookStatus } from '../types/book'

interface Props {
  onAdded: () => void
  onClose: () => void
}

function toInputDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function ManualAddModal({ onAdded, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<BookStatus>('to_read')
  const [finishedDate, setFinishedDate] = useState(toInputDate(new Date()))
  const [isSaving, setIsSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleConfirm = async () => {
    if (!title.trim()) return
    setIsSaving(true)
    try {
      let coverUrl = ''
      if (coverFile) {
        const userId = auth.currentUser?.uid
        if (userId) {
          const storageRef = ref(storage, `bookCovers/${userId}/${Date.now()}`)
          await uploadBytes(storageRef, coverFile)
          coverUrl = await getDownloadURL(storageRef)
        }
      }
      const authorList = authors.trim()
        ? authors.split(',').map((a) => a.trim()).filter(Boolean)
        : []
      const finishedAt =
        status === 'read' && finishedDate ? new Date(finishedDate + 'T12:00:00') : undefined
      await addManualBook({ title: title.trim(), authors: authorList, coverUrl }, status, finishedAt)
      onAdded()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-6 sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold text-white">Ajouter manuellement</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cover upload */}
        <div className="mb-5 flex justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-36 w-24 overflow-hidden rounded-xl bg-slate-700 ring-1 ring-slate-600 hover:ring-indigo-500 transition flex items-center justify-center"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Couverture" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-xs text-center leading-tight px-1">Ajouter une couverture</span>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Title */}
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du livre"
            className="w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Authors */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Auteur(s) <span className="text-slate-600">— séparés par des virgules</span>
          </label>
          <input
            type="text"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            placeholder="ex. Albert Camus, Simone de Beauvoir"
            className="w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Status */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Statut</p>
          <div className="grid grid-cols-3 gap-2">
            {([['read', 'Lu', 'bg-emerald-600'], ['reading', 'En cours', 'bg-indigo-600'], ['to_read', 'À lire', 'bg-slate-600']] as [BookStatus, string, string][]).map(([s, label, activeColor]) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                  status === s ? `${activeColor} text-white` : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Date if read */}
        {status === 'read' && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Date de fin</label>
            <input
              type="date"
              value={finishedDate}
              onChange={(e) => setFinishedDate(e.target.value)}
              max={toInputDate(new Date())}
              className="w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500 transition"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!title.trim() || isSaving}
          className="mt-2 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
        >
          {isSaving ? 'Enregistrement...' : 'Ajouter le livre'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-2.5 text-sm text-slate-400 hover:text-slate-200"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
