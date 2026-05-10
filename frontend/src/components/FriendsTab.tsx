import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  subscribeToRecommendations,
  deleteRecommendation,
  addBook,
  getFriendsStories,
  getMyStories,
  getFriendBooks,
  type FriendshipStatus,
} from '../lib/firestore'
import type { BookResult, FriendEntry, FriendRequest, Recommendation, Story, UserBook, UserProfile } from '../types/book'
import FriendLibraryScreen from './FriendLibraryScreen'
import LeaderboardScreen from './LeaderboardScreen'
import StoryModal from './StoryModal'

interface Props {
  myUid: string
  myProfile: UserProfile
  onPendingCountChange: (n: number) => void
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'self' }
  | { kind: 'found'; profile: UserProfile; status: FriendshipStatus }

function SwipeToDelete({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const dragging = useRef(false)

  return (
    <div
      style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? 'none' : 'transform 250ms ease-out, opacity 250ms', opacity: offset < -120 ? 0 : 1 }}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; dragging.current = true }}
      onTouchMove={(e) => {
        const dx = startX.current - e.touches[0].clientX
        if (dx > 0) setOffset(-Math.min(dx, 160))
      }}
      onTouchEnd={() => {
        dragging.current = false
        if (offset < -80) { setOffset(-400); setTimeout(onDelete, 260) }
        else setOffset(0)
      }}
      onTouchCancel={() => { dragging.current = false; setOffset(0) }}
    >
      {children}
    </div>
  )
}

export default function FriendsTab({ myUid, myProfile, onPendingCountChange }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ kind: 'idle' })
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [friendStories, setFriendStories] = useState<Story[]>([])
  const [myStories, setMyStories] = useState<Story[]>([])
  const [activeStories, setActiveStories] = useState<{ stories: Story[]; isMe: boolean } | null>(null)
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seenStoryIds') ?? '[]') as string[]) }
    catch { return new Set() }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [friendsReading, setFriendsReading] = useState<{ friend: FriendEntry; book: UserBook }[]>([])
  const [viewingFriend, setViewingFriend] = useState<FriendEntry | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null)
  const [addingRec, setAddingRec] = useState(false)
  const [recDescription, setRecDescription] = useState<string | null>(null)
  const [loadingDesc, setLoadingDesc] = useState(false)
  const [showRecFullDesc, setShowRecFullDesc] = useState(false)

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
    const unsubRecs = subscribeToRecommendations(setRecommendations)
    return () => { unsubReqs(); unsubFriends(); unsubRecs() }
  }, [myUid])

  // Stable key: only re-fetch when actual friend UIDs change, not on every snapshot ref
  const friendsUidKey = friends.map((f) => f.uid).sort().join(',')

  useEffect(() => {
    if (!friendsUidKey) return
    void getFriendsStories(friends).then(setFriendStories)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsUidKey])

  useEffect(() => {
    void getMyStories().then((s) =>
      setMyStories(s.map((story) => ({ ...story, fromUsername: myProfile.username })))
    )
  }, [myProfile.username])

  useEffect(() => {
    if (!friendsUidKey) { setFriendsReading([]); return }
    const candidates = friends.slice(0, 6)
    void Promise.allSettled(candidates.map((f) => getFriendBooks(f.uid))).then((results) => {
      const reading: { friend: FriendEntry; book: UserBook }[] = []
      for (let i = 0; i < candidates.length; i++) {
        if (reading.length >= 3) break
        const r = results[i]
        if (r.status !== 'fulfilled') continue
        const readingBook = r.value.find((b) => b.status === 'reading')
        if (readingBook) reading.push({ friend: candidates[i], book: readingBook })
      }
      setFriendsReading(reading)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsUidKey])

  useEffect(() => {
    if (selectedRec) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedRec])

  useEffect(() => {
    if (!selectedRec) { setRecDescription(null); setShowRecFullDesc(false); return }
    const id = selectedRec.googleBooksId
    if (!id) return
    setLoadingDesc(true)
    const controller = new AbortController()
    fetch(`https://www.googleapis.com/books/v1/volumes/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const raw = (data?.volumeInfo?.description as string | undefined) ?? null
        const clean = raw ? raw.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, (m) => {
          const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }
          return map[m] ?? m
        }) : null
        setRecDescription(clean)
      })
      .catch((err: unknown) => { if ((err as { name?: string }).name !== 'AbortError') setRecDescription(null) })
      .finally(() => setLoadingDesc(false))
    return () => controller.abort()
  }, [selectedRec])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim().replace(/^@/, '').toLowerCase()
    if (!q) return
    setSearchState({ kind: 'loading' })
    try {
      const profile = await searchUserByUsername(q)
      if (!profile) { setSearchState({ kind: 'not_found' }); return }
      if (profile.uid === myUid) { setSearchState({ kind: 'self' }); return }
      const status = await checkFriendshipStatus(profile.uid)
      setSearchState({ kind: 'found', profile, status })
    } catch {
      setSearchState({ kind: 'idle' })
    }
  }

  const handleSendRequest = async (toUid: string) => {
    try {
      await sendFriendRequest(toUid)
      setSearchState((prev) =>
        prev.kind === 'found' ? { ...prev, status: 'pending_sent' } : prev,
      )
    } catch { /* silently ignore */ }
  }

  const handleCancelRequest = async (toUid: string) => {
    try {
      await cancelFriendRequest(toUid)
      setSearchState((prev) =>
        prev.kind === 'found' ? { ...prev, status: 'none' } : prev,
      )
    } catch { /* silently ignore */ }
  }

  const handleAccept = async (req: FriendRequest) => {
    try {
      await acceptFriendRequest(req.uid, req.username)
      setSearchState({ kind: 'idle' })
    } catch { /* silently ignore */ }
  }

  const handleReject = async (fromUid: string) => {
    try {
      await rejectFriendRequest(fromUid)
    } catch { /* silently ignore */ }
  }

  const openStories = (_uid: string, stories: Story[], isMe: boolean) => {
    setActiveStories({ stories, isMe })
    const newSeen = new Set(seenIds)
    stories.forEach((s) => newSeen.add(s.id))
    setSeenIds(newSeen)
    localStorage.setItem('seenStoryIds', JSON.stringify([...newSeen]))
  }

  const storiesByUid = new Map<string, Story[]>()
  for (const s of friendStories) {
    if (!storiesByUid.has(s.fromUid)) storiesByUid.set(s.fromUid, [])
    storiesByUid.get(s.fromUid)!.push(s)
  }
  if (myStories.length > 0) storiesByUid.set(myUid, myStories)

  const toHttps = (url: string) => url.replace('http://', 'https://')

  const handleAddFromRec = async (rec: Recommendation) => {
    setAddingRec(true)
    try {
      const bookResult: BookResult = {
        google_books_id: rec.googleBooksId ?? '',
        isbn13: null,
        isbn10: null,
        title: rec.bookTitle,
        subtitle: null,
        authors: rec.bookAuthors,
        publisher: null,
        published_date: null,
        page_count: null,
        description: null,
        cover_url: rec.bookCoverUrl,
        thumbnail_url: rec.bookThumbnailUrl,
        categories: [],
        language: null,
      }
      await addBook(bookResult, 'to_read')
      await deleteRecommendation(rec.id)
      setSelectedRec(null)
    } finally {
      setAddingRec(false)
    }
  }

  const handleRemoveFriend = async (friendUid: string) => {
    try {
      await removeFriend(friendUid)
      if (viewingFriend?.uid === friendUid) setViewingFriend(null)
    } catch { /* silently ignore */ }
  }

  if (showLeaderboard) {
    return (
      <LeaderboardScreen
        myProfile={myProfile}
        friends={friends}
        onClose={() => setShowLeaderboard(false)}
        onFriendClick={(friend) => { setShowLeaderboard(false); setViewingFriend(friend) }}
      />
    )
  }

  if (viewingFriend) {
    return <FriendLibraryScreen friend={viewingFriend} onClose={() => setViewingFriend(null)} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-24">
      {activeStories && (
        <StoryModal
          stories={activeStories.stories}
          isMe={activeStories.isMe}
          onClose={() => setActiveStories(null)}
          onDeleted={(id) => {
            setMyStories((prev) => prev.filter((s) => s.id !== id))
            setActiveStories((prev) =>
              prev ? { ...prev, stories: prev.stories.filter((s) => s.id !== id) } : null
            )
          }}
        />
      )}
      {/* Recommendation detail modal — portal to body to escape stacking context */}
      {selectedRec && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70" onClick={() => setSelectedRec(null)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-slate-900 flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                @{selectedRec.fromUsername} recommande
              </p>
              <button
                onClick={() => setSelectedRec(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Book info */}
            <div className="flex items-start gap-4 px-5 pb-4 shrink-0">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-800 shadow-xl ring-1 ring-white/10">
                <img
                  src={toHttps(selectedRec.bookThumbnailUrl ?? selectedRec.bookCoverUrl)}
                  alt={selectedRec.bookTitle}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white leading-tight">{selectedRec.bookTitle}</p>
                <p className="text-xs text-slate-400 mt-1">{selectedRec.bookAuthors.join(', ')}</p>
                {selectedRec.message && (
                  <p className="mt-2 text-xs text-slate-400 italic leading-relaxed">"{selectedRec.message}"</p>
                )}
              </div>
            </div>

            {/* Synopsis — scrollable middle zone, expands downward */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
              {loadingDesc ? (
                <div className="flex justify-center py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
                </div>
              ) : recDescription ? (
                <>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Synopsis</p>
                  <div
                    style={{
                      maxHeight: showRecFullDesc ? '600px' : '96px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <p className="text-sm leading-relaxed text-slate-400">{recDescription}</p>
                  </div>
                  {recDescription.length > 200 && (
                    <button
                      onClick={() => setShowRecFullDesc((v) => !v)}
                      className="mt-1.5 text-xs text-indigo-400 transition hover:text-indigo-300"
                    >
                      {showRecFullDesc ? '↑ Voir moins' : '↓ Voir plus'}
                    </button>
                  )}
                </>
              ) : null}
            </div>

            {/* Action — always pinned at bottom */}
            <div className="shrink-0 px-5 pt-2 pb-8">
              <button
                onClick={() => void handleAddFromRec(selectedRec)}
                disabled={addingRec}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
              >
                {addingRec ? 'Ajout...' : '+ Ajouter à ma liste'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header + search */}
      <div className="px-4 pt-4 pb-3 sm:px-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Amis</h1>
          {friends.length > 0 && (
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-slate-400 transition hover:text-white"
              aria-label="Classement"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A5.25 5.25 0 0012 9a5.25 5.25 0 00-4.5 5.25v4.5m9 0H7.5M6 9H4.5m15 0H18M12 3v1.5m4.5.75-1.06 1.06M7.5 5.25 6.44 6.31" />
              </svg>
              <span className="text-xs font-medium">Classement</span>
            </button>
          )}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 ring-1 ring-slate-700 focus-within:ring-indigo-500 transition">
            <span className="text-slate-500 font-medium text-sm">@</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchState({ kind: 'idle' }) }}
              placeholder="Cherche un pseudo…"
              enterKeyHint="search"
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

      {/* Stories strip */}
      {storiesByUid.size > 0 && (
        <div className="px-4 pt-1 pb-3 sm:px-6">
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 -mx-4 px-4 scrollbar-hide">
            {/* My stories bubble */}
            {myStories.length > 0 && (() => {
              const hasUnseen = myStories.some((s) => !seenIds.has(s.id))
              return (
                <button
                  key="me"
                  onClick={() => openStories(myUid, myStories, true)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 transition ${hasUnseen ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : 'ring-1 ring-slate-700'}`}>
                    <span className="text-lg font-bold text-indigo-300">{myProfile.username[0].toUpperCase()}</span>
                  </div>
                  <span className="max-w-[56px] truncate text-[10px] text-slate-400">Toi</span>
                </button>
              )
            })()}
            {/* Friends stories bubbles */}
            {friends.filter((f) => storiesByUid.has(f.uid)).map((f) => {
              const stories = storiesByUid.get(f.uid)!
              const hasUnseen = stories.some((s) => !seenIds.has(s.id))
              return (
                <button
                  key={f.uid}
                  onClick={() => openStories(f.uid, stories, false)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 transition ${hasUnseen ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : 'ring-1 ring-slate-700'}`}>
                    <span className="text-lg font-bold text-slate-300">{f.username[0].toUpperCase()}</span>
                  </div>
                  <span className="max-w-[56px] truncate text-[10px] text-slate-400">@{f.username}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Ce que lisent tes amis en ce moment */}
      {friendsReading.length > 0 && (
        <div className="px-4 sm:px-6 pb-3">
          <h2 className="mb-2.5 text-sm font-semibold text-white">📖 Ce que lisent tes amis</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {friendsReading.map(({ friend, book }) => (
              <button
                key={friend.uid}
                onClick={() => setViewingFriend(friend)}
                className="flex shrink-0 flex-col gap-2 w-32 text-left transition active:scale-[0.97]"
              >
                {/* Cover */}
                <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-800 ring-1 ring-white/5 shadow-lg">
                  {book.coverUrl || book.thumbnailUrl ? (
                    <img
                      src={book.coverUrl || book.thumbnailUrl!}
                      alt={book.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        if (book.thumbnailUrl && img.src !== book.thumbnailUrl) {
                          img.src = book.thumbnailUrl
                        } else {
                          img.style.display = 'none'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2">
                      <span className="text-center text-[9px] text-slate-500 leading-tight">{book.title}</span>
                    </div>
                  )}
                </div>
                {/* Meta */}
                <div>
                  <p className="text-[10px] font-semibold text-indigo-400 leading-tight">@{friend.username} lit</p>
                  <p className="text-xs font-semibold text-white leading-tight line-clamp-2 mt-0.5">{book.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          </div>
        ) : (
          <>
            {/* Recommandations reçues */}
            {recommendations.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Recommandations
                  <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{recommendations.length}</span>
                </h2>
                <div className="space-y-2">
                  {recommendations.map((rec) => (
                    <SwipeToDelete key={rec.id} onDelete={() => void deleteRecommendation(rec.id)}>
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-800/60 ring-1 ring-white/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedRec(rec)}
                          className="flex flex-1 items-start gap-3 px-4 py-3 text-left transition active:bg-slate-700/40"
                        >
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-700">
                            <img
                              src={toHttps(rec.bookThumbnailUrl ?? rec.bookCoverUrl)}
                              alt={rec.bookTitle}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-indigo-400 font-medium">@{rec.fromUsername} recommande</p>
                            <p className="text-sm font-semibold text-white truncate">{rec.bookTitle}</p>
                            <p className="text-xs text-slate-500 truncate">{rec.bookAuthors.join(', ')}</p>
                            {rec.message && (
                              <p className="mt-1 text-xs text-slate-400 italic">"{rec.message}"</p>
                            )}
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-1 h-4 w-4 shrink-0 text-slate-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => void deleteRecommendation(rec.id)}
                          className="shrink-0 self-stretch flex items-center justify-center w-11 text-slate-600 hover:text-slate-400 transition"
                          aria-label="Ignorer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </SwipeToDelete>
                  ))}
                </div>
              </section>
            )}

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
                    <div
                      key={friend.uid}
                      className="flex w-full items-center justify-between rounded-2xl bg-slate-800/60 px-4 py-3 ring-1 ring-white/5 transition hover:bg-slate-800 hover:ring-white/10"
                    >
                      <button
                        onClick={() => setViewingFriend(friend)}
                        className="flex flex-1 items-center gap-3 text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 ring-1 ring-indigo-500/30">
                          <span className="text-sm font-bold text-indigo-400">{friend.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">@{friend.username}</p>
                          <p className="text-xs text-slate-500">Voir la bibliothèque →</p>
                        </div>
                      </button>
                      <button
                        onClick={() => void handleRemoveFriend(friend.uid)}
                        className="rounded-lg p-2 text-slate-600 hover:text-red-400 transition"
                        aria-label="Retirer ami"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
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
