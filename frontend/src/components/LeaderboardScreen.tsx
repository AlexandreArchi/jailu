import { useEffect, useMemo, useState } from 'react'
import { getUserBooks, getFriendBooks } from '../lib/firestore'
import type { FriendEntry, UserBook, UserProfile } from '../types/book'

interface Props {
  myProfile: UserProfile
  friends: FriendEntry[]
  onClose: () => void
  onFriendClick: (friend: FriendEntry) => void
}

type Metric = 'books' | 'pages' | 'hours'

interface PlayerStats {
  uid: string
  username: string
  isMe: boolean
  booksRead: number
  pagesRead: number
  readingTimeHours: number
}

const MEDALS = ['🥇', '🥈', '🥉']

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 10) return `${h.toFixed(1)} h`
  return `${Math.round(h)} h`
}

function computeStats(uid: string, username: string, isMe: boolean, books: UserBook[], year: number | null): PlayerStats {
  const read = books.filter((b) => {
    if (b.status !== 'read') return false
    if (year === null) return true
    const d = b.finishedAt ?? b.createdAt
    return new Date(d).getFullYear() === year
  })
  const pagesRead = read.reduce((s, b) => s + (b.pageCount ?? 0), 0)
  return {
    uid,
    username,
    isMe,
    booksRead: read.length,
    pagesRead,
    readingTimeHours: (pagesRead * 1.5) / 60,
  }
}

export default function LeaderboardScreen({ myProfile, friends, onClose, onFriendClick }: Props) {
  const [allBooks, setAllBooks] = useState<Map<string, UserBook[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear())
  const [metric, setMetric] = useState<Metric>('books')
  const [selectedUids, setSelectedUids] = useState<Set<string>>(
    () => new Set([myProfile.uid, ...friends.map((f) => f.uid)])
  )

  useEffect(() => {
    const players = [
      { uid: myProfile.uid, fetch: getUserBooks() },
      ...friends.map((f) => ({ uid: f.uid, fetch: getFriendBooks(f.uid) })),
    ]
    Promise.all(players.map(async (p) => ({ uid: p.uid, books: await p.fetch })))
      .then((results) => {
        const map = new Map<string, UserBook[]>()
        for (const r of results) map.set(r.uid, r.books)
        setAllBooks(map)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [myProfile.uid, friends])

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = new Set<number>()
    for (const books of allBooks.values()) {
      for (const b of books) {
        if (b.status !== 'read') continue
        const d = b.finishedAt ?? b.createdAt
        const y = new Date(d).getFullYear()
        if (y >= currentYear - 2) years.add(y)
      }
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [allBooks])

  const rankings = useMemo(() => {
    const players: PlayerStats[] = []
    for (const [uid, books] of allBooks.entries()) {
      if (!selectedUids.has(uid)) continue
      const isMe = uid === myProfile.uid
      const username = isMe ? myProfile.username : (friends.find((f) => f.uid === uid)?.username ?? uid)
      players.push(computeStats(uid, username, isMe, books, selectedYear))
    }
    const key: Record<Metric, keyof PlayerStats> = { books: 'booksRead', pages: 'pagesRead', hours: 'readingTimeHours' }
    return players.sort((a, b) => {
      const diff = (b[key[metric]] as number) - (a[key[metric]] as number)
      if (diff !== 0) return diff
      // Tiebreaker : à égalité de livres → départager par pages lues
      if (metric === 'books') return b.pagesRead - a.pagesRead
      return 0
    })
  }, [allBooks, selectedUids, selectedYear, metric, myProfile, friends])

  const maxValue = rankings[0]
    ? metric === 'books' ? rankings[0].booksRead : metric === 'pages' ? rankings[0].pagesRead : rankings[0].readingTimeHours
    : 1

  const getValue = (p: PlayerStats) =>
    metric === 'books' ? p.booksRead : metric === 'pages' ? p.pagesRead : p.readingTimeHours

  const formatValue = (p: PlayerStats) =>
    metric === 'books' ? `${p.booksRead} livre${p.booksRead > 1 ? 's' : ''}` :
    metric === 'pages' ? `${p.pagesRead.toLocaleString('fr-FR')} pages` :
    formatHours(p.readingTimeHours)

  const toggleUid = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) { if (next.size > 1) next.delete(uid) }
      else next.add(uid)
      return next
    })
  }

  const allPlayers = [
    { uid: myProfile.uid, username: myProfile.username, isMe: true },
    ...friends.map((f) => ({ uid: f.uid, username: f.username, isMe: false })),
  ]

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
        <h1 className="text-lg font-bold text-white">Classement</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="space-y-4 px-4 sm:px-6">

          {/* Player filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allPlayers.map((p) => {
              const active = selectedUids.has(p.uid)
              return (
                <button
                  key={p.uid}
                  onClick={() => toggleUid(p.uid)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? p.isMe ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${active ? 'bg-white/20' : 'bg-slate-700'}`}>
                    {p.username[0].toUpperCase()}
                  </span>
                  @{p.username}{p.isMe && ' (moi)'}
                </button>
              )
            })}
          </div>

          {/* Year filter */}
          {availableYears.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedYear(null)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedYear === null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                Tout
              </button>
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedYear === y ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Metric tabs */}
          <div className="grid grid-cols-3 gap-2">
            {([['books', 'Livres'], ['pages', 'Pages'], ['hours', 'Heures']] as [Metric, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition ${metric === key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rankings */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
            </div>
          ) : rankings.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Aucune donnée pour cette période.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {rankings.map((player, i) => {
                const value = getValue(player)
                const barPct = maxValue > 0 ? (value / maxValue) * 100 : 0
                const medal = MEDALS[i]
                const friend = friends.find((f) => f.uid === player.uid)

                const inner = (
                  <>
                    <div
                      className={`absolute inset-y-0 left-0 rounded-2xl transition-all duration-700 ${player.isMe ? 'bg-indigo-600/15' : 'bg-white/5'}`}
                      style={{ width: `${barPct}%` }}
                    />
                    <div className="relative flex items-center gap-3">
                      <div className="w-8 shrink-0 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-500">{i + 1}</span>
                        )}
                      </div>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${player.isMe ? 'bg-indigo-600/30 ring-1 ring-indigo-500/40' : 'bg-slate-700'}`}>
                        <span className={`text-sm font-bold ${player.isMe ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {player.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${player.isMe ? 'text-indigo-200' : 'text-white'}`}>
                          @{player.username}
                          {player.isMe && <span className="ml-1 text-[10px] font-medium text-indigo-400">toi</span>}
                          {!player.isMe && <span className="ml-1 text-[10px] text-slate-500">→</span>}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${i === 0 ? 'text-amber-400' : player.isMe ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {formatValue(player)}
                        </p>
                      </div>
                    </div>
                  </>
                )

                return friend ? (
                  <button
                    key={player.uid}
                    onClick={() => onFriendClick(friend)}
                    className={`relative w-full overflow-hidden rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.98] ${player.isMe ? 'ring-2 ring-indigo-500/60 bg-indigo-950/40' : 'bg-slate-800/60 ring-1 ring-white/5 hover:bg-slate-800'}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div
                    key={player.uid}
                    className={`relative overflow-hidden rounded-2xl px-4 py-3.5 ${player.isMe ? 'ring-2 ring-indigo-500/60 bg-indigo-950/40' : 'bg-slate-800/60 ring-1 ring-white/5'}`}
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
