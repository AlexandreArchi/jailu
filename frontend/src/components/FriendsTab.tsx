import { useEffect, useState } from 'react'
import {
  searchUserByUsername,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  checkFriendshipStatus,
  subscribeToPendingRequests,
  subscribeToFriends,
  type FriendshipStatus,
} from '../lib/firestore'
import type { FriendEntry, FriendRequest, UserProfile } from '../types/book'
import FriendLibraryScreen from './FriendLibraryScreen'

interface Props {
  myUid: string
  onPendingCountChange: (n: number) => void
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'self' }
  | { kind: 'found'; profile: UserProfile; status: FriendshipStatus }

export default function FriendsTab({ myUid, onPendingCountChange }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ kind: 'idle' })
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingFriend, setViewingFriend] = useState<FriendEntry | null>(null)

  useEffect(() => {
    const unsubReqs = subscribeToPendingRequests((reqs) => {
      setPendingRequests(reqs)
      onPendingCountChange(reqs.length)
      setIsLoading(false)
    })
    const unsubFriends = subscribeToFriends((frs) => {
      setFriends(frs)
      setIsLoading(false)
    })
    return () => { unsubReqs(); unsubFriends() }
  }, [myUid])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim().replace(/^@/, '').toLowerCase()
    if (!q) return
    setSearchState({ kind: 'loading' })
    const profile = await searchUserByUsername(q)
    if (!profile) { setSearchState({ kind: 'not_found' }); return }
    if (profile.uid === myUid) { setSearchState({ kind: 'self' }); return }
    const status = await checkFriendshipStatus(profile.uid)
    setSearchState({ kind: 'found', profile, status })
  }

  const handleSendRequest = async (toUid: string) => {
    await sendFriendRequest(toUid)
    setSearchState((prev) =>
      prev.kind === 'found' ? { ...prev, status: 'pending_sent' } : prev,
    )
  }

  const handleCancelRequest = async (toUid: string) => {
    await cancelFriendRequest(toUid)
    setSearchState((prev) =>
      prev.kind === 'found' ? { ...prev, status: 'none' } : prev,
    )
  }

  const handleAccept = async (req: FriendRequest) => {
    await acceptFriendRequest(req.uid, req.username)
    setSearchState({ kind: 'idle' })
  }

  const handleReject = async (fromUid: string) => {
    await rejectFriendRequest(fromUid)
  }

  const handleRemoveFriend = async (friendUid: string) => {
    await removeFriend(friendUid)
    if (viewingFriend?.uid === friendUid) setViewingFriend(null)
  }

  if (viewingFriend) {
    return <FriendLibraryScreen friend={viewingFriend} onClose={() => setViewingFriend(null)} />
  }

  return (
    <div className="flex flex-1 flex-col pb-24">
      {/* Header + search */}
      <div className="px-4 pt-4 pb-3 sm:px-6 space-y-3">
        <h1 className="text-lg font-bold text-white">Amis</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 ring-1 ring-slate-700 focus-within:ring-indigo-500 transition">
            <span className="text-slate-500 font-medium text-sm">@</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchState({ kind: 'idle' }) }}
              placeholder="Cherche un pseudo…"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setSearchState({ kind: 'idle' }) }} className="text-slate-500 hover:text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Chercher
          </button>
        </form>

        {/* Search result */}
        {searchState.kind === 'loading' && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          </div>
        )}
        {searchState.kind === 'not_found' && (
          <p className="text-sm text-slate-500">Aucun utilisateur trouvé avec ce pseudo.</p>
        )}
        {searchState.kind === 'self' && (
          <p className="text-sm text-slate-500">C'est toi ! 👋</p>
        )}
        {searchState.kind === 'found' && (
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 px-4 py-3 ring-1 ring-white/5">
            <div>
              <p className="font-semibold text-white">@{searchState.profile.username}</p>
              <p className="text-xs text-slate-500">Membre depuis {searchState.profile.createdAt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
            </div>
            {searchState.status === 'friends' && (
              <span className="text-xs font-medium text-emerald-400">Amis ✓</span>
            )}
            {searchState.status === 'pending_sent' && (
              <button
                onClick={() => handleCancelRequest(searchState.profile.uid)}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition"
              >
                Annuler
              </button>
            )}
            {searchState.status === 'pending_received' && (
              <button
                onClick={() => handleAccept({ uid: searchState.profile.uid, username: searchState.profile.username, createdAt: new Date() })}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
              >
                Accepter
              </button>
            )}
            {searchState.status === 'none' && (
              <button
                onClick={() => handleSendRequest(searchState.profile.uid)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
              >
                Ajouter
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          </div>
        ) : (
          <>
            {/* Demandes reçues */}
            {pendingRequests.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Demandes reçues
                  <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">{pendingRequests.length}</span>
                </h2>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.uid} className="flex items-center justify-between rounded-2xl bg-slate-800/60 px-4 py-3 ring-1 ring-white/5">
                      <div>
                        <p className="font-semibold text-white">@{req.username}</p>
                        <p className="text-xs text-slate-500">{req.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(req.uid)}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition"
                        >
                          Refuser
                        </button>
                        <button
                          onClick={() => handleAccept(req)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                        >
                          Accepter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mes amis */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">
                Mes amis
                {friends.length > 0 && (
                  <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">{friends.length}</span>
                )}
              </h2>
              {friends.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 ring-1 ring-white/5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-slate-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Aucun ami pour l'instant.<br />Cherche un pseudo pour commencer !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <button
                      key={friend.uid}
                      onClick={() => setViewingFriend(friend)}
                      className="flex w-full items-center justify-between rounded-2xl bg-slate-800/60 px-4 py-3 ring-1 ring-white/5 text-left transition hover:bg-slate-800 hover:ring-white/10 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 ring-1 ring-indigo-500/30">
                          <span className="text-sm font-bold text-indigo-400">{friend.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">@{friend.username}</p>
                          <p className="text-xs text-slate-500">Voir la bibliothèque →</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleRemoveFriend(friend.uid) }}
                        className="rounded-lg p-2 text-slate-600 hover:text-red-400 transition"
                        aria-label="Retirer ami"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
