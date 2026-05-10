import { useEffect, useState } from 'react'
import { getMyFriends, getMyProfile, sendRecommendation } from '../lib/firestore'
import type { FriendEntry, UserBook } from '../types/book'

interface Props {
  book: UserBook
  onClose: () => void
}

export default function RecommendBookModal({ book, onClose }: Props) {
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [selectedUid, setSelectedUid] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    void getMyFriends().then(setFriends)
  }, [])

  const [sendError, setSendError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!selectedUid) return
    setIsSending(true)
    setSendError(null)
    try {
      const myProfile = await getMyProfile()
      await sendRecommendation(
        selectedUid,
        {
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          thumbnailUrl: book.thumbnailUrl,
          googleBooksId: book.googleBooksId,
        },
        message.trim() || null,
        myProfile?.username ?? '',
      )
      setSent(true)
      setTimeout(onClose, 1200)
    } catch {
      setSendError('Erreur lors de l\'envoi. Réessaie.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="font-semibold text-white">Recommander</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white">Recommandation envoyée !</p>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-white">{book.title}</span>
            </p>

            {friends.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun ami pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Choisir un ami</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {friends.map((f) => (
                    <button
                      key={f.uid}
                      onClick={() => setSelectedUid(f.uid)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        selectedUid === f.uid ? 'bg-indigo-600/30 ring-1 ring-indigo-500/50' : 'bg-slate-700/60 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20">
                        <span className="text-sm font-bold text-indigo-400">{f.username[0].toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-white">@{f.username}</span>
                      {selectedUid === f.uid && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="ml-auto h-4 w-4 text-indigo-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Message (optionnel)</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Dis pourquoi tu recommandes ce livre…"
                className="w-full resize-none rounded-xl bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
              />
            </div>

            {sendError && (
              <p className="text-xs text-red-400 text-center">{sendError}</p>
            )}
            <button
              onClick={() => void handleSend()}
              disabled={!selectedUid || isSending}
              className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              {isSending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
