import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { followUser, markNotificationsRead, deleteNotification } from '../lib/firestore'
import type { AppNotification } from '../types/book'

interface Props {
  notifications: AppNotification[]
  myFollowingUids: Set<string>
  onClose: () => void
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationsPanel({ notifications, myFollowingUids, onClose }: Props) {
  const [loadingUids, setLoadingUids] = useState<Set<string>>(new Set())

  // Mark all unread as read when panel opens
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unread.length > 0) void markNotificationsRead(unread)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFollowBack = async (notif: AppNotification) => {
    if (loadingUids.has(notif.fromUid)) return
    setLoadingUids((prev) => new Set([...prev, notif.fromUid]))
    try {
      await followUser(notif.fromUid, notif.fromUsername, notif.fromPhotoURL)
    } catch {
      // silently ignore (e.g. already following)
    } finally {
      setLoadingUids((prev) => { const s = new Set(prev); s.delete(notif.fromUid); return s })
    }
    // Supprimer la notification une fois traitée
    await handleDelete(notif.id)
  }

  const handleDelete = async (id: string) => {
    try { await deleteNotification(id) } catch { /* ignore */ }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel — slides down, aligné sur le header */}
      <div className="fixed left-4 right-4 top-[72px] z-50 mx-auto max-w-lg animate-slide-down">
        <div className="rounded-2xl bg-slate-900 shadow-2xl shadow-black/60 ring-1 ring-white/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Notifications</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-slate-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm text-slate-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-center gap-3 px-4 py-3 transition ${notif.read ? '' : 'bg-indigo-950/30'}`}
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 ring-1 ring-indigo-500/30">
                    {notif.fromPhotoURL ? (
                      <img src={notif.fromPhotoURL} alt={notif.fromUsername} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-indigo-400">{notif.fromUsername[0].toUpperCase()}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug">
                      <span className="font-semibold">@{notif.fromUsername}</span>
                      {' '}a commencé à te suivre
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {myFollowingUids.has(notif.fromUid) ? (
                      /* Déjà abonné en retour — juste une croix pour fermer */
                      <button
                        onClick={() => void handleDelete(notif.id)}
                        className="text-slate-600 hover:text-slate-400 transition p-0.5"
                        aria-label="Supprimer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      /* Pas encore abonné — bouton Suivre + croix */
                      <>
                        <button
                          onClick={() => void handleFollowBack(notif)}
                          disabled={loadingUids.has(notif.fromUid)}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                        >
                          {loadingUids.has(notif.fromUid) ? '…' : 'Suivre'}
                        </button>
                        <button
                          onClick={() => void handleDelete(notif.id)}
                          className="text-slate-600 hover:text-slate-400 transition p-0.5"
                          aria-label="Supprimer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
