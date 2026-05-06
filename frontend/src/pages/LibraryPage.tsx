import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { getUserBooks, getMyProfile } from '../lib/firestore'
import BottomNav from '../components/BottomNav'
import HomeTab from '../components/HomeTab'
import ToReadTab from '../components/ToReadTab'
import ReadTab from '../components/ReadTab'
import SearchTab from '../components/SearchTab'
import FriendsTab from '../components/FriendsTab'
import BookDetailModal from '../components/BookDetailModal'
import StatsScreen from '../components/StatsScreen'
import UsernameSetupModal from '../components/UsernameSetupModal'
import ProfileModal from '../components/ProfileModal'
import type { UserBook, UserProfile } from '../types/book'

type Tab = 'home' | 'to_read' | 'read' | 'search' | 'friends'

interface LibraryPageProps {
  user: User
}

export default function LibraryPage({ user }: LibraryPageProps) {
  const [myProfile, setMyProfile] = useState<UserProfile | null | 'loading'>('loading')
  const [userBooks, setUserBooks] = useState<UserBook[]>([])
  const [isBooksLoading, setIsBooksLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [bookToEdit, setBookToEdit] = useState<UserBook | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    getMyProfile().then(setMyProfile).catch(() => setMyProfile(null))
  }, [user.uid])

  const loadBooks = useCallback(async () => {
    try {
      const books = await getUserBooks()
      setUserBooks(books)
    } catch {
      setUserBooks([])
    } finally {
      setIsBooksLoading(false)
    }
  }, [])

  useEffect(() => { void loadBooks() }, [loadBooks])

  const toReadCount = userBooks.filter((b) => b.status === 'to_read' || b.status === 'reading').length
  const readCount = userBooks.filter((b) => b.status === 'read').length
  const displayName = myProfile && myProfile !== 'loading' ? myProfile.username : (user.displayName ?? user.email ?? 'Lecteur')

  if (myProfile === 'loading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-slate-950">
        <img src="/app-icon.svg" alt="JAILU" className="h-20 w-20 rounded-3xl shadow-2xl shadow-indigo-950" />
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    )
  }

  if (myProfile === null) {
    return (
      <UsernameSetupModal
        onComplete={(profile) => setMyProfile(profile)}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="shrink-0 border-b border-slate-800/80 px-4 pt-12 pb-3 sm:pt-6 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-xl" />
            <span className="text-xl font-bold tracking-tight text-white">JAILU</span>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-1.5 ring-1 ring-white/5 transition hover:bg-slate-800"
          >
            <div className="h-6 w-6 overflow-hidden rounded-full bg-indigo-600/30 ring-1 ring-indigo-500/30">
              {myProfile.photoURL ? (
                <img src={myProfile.photoURL} alt={myProfile.username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[10px] font-bold text-indigo-400">{myProfile.username[0].toUpperCase()}</span>
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-slate-300">@{myProfile.username}</span>
          </button>
        </div>
      </header>

      <div key={activeTab} className="animate-tab-enter mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'home' && (
          <HomeTab
            books={userBooks}
            isLoading={isBooksLoading}
            displayName={displayName}
            onBookClick={(book) => setBookToEdit(book)}
            onGoToTab={(tab) => setActiveTab(tab)}
            onShowStats={() => setShowStats(true)}
            onGoToSearch={() => setActiveTab('search')}
            goal={myProfile.readingGoal ?? null}
            onGoalChange={(g) => setMyProfile({ ...myProfile, readingGoal: g })}
          />
        )}
        {activeTab === 'to_read' && (
          <ToReadTab books={userBooks} onBookClick={(book) => setBookToEdit(book)} />
        )}
        {activeTab === 'read' && (
          <ReadTab
            books={userBooks}
            onBookClick={(book) => setBookToEdit(book)}
            onShowStats={() => setShowStats(true)}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab onBookAdded={() => void loadBooks()} />
        )}
        {activeTab === 'friends' && (
          <FriendsTab
            myUid={user.uid}
            myProfile={myProfile}
            onPendingCountChange={setPendingFriendsCount}
          />
        )}
      </div>

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        toReadCount={toReadCount}
        readCount={readCount}
        pendingFriendsCount={pendingFriendsCount}
      />

      {bookToEdit !== null && (
        <BookDetailModal
          book={bookToEdit}
          onClose={() => setBookToEdit(null)}
          onUpdated={() => void loadBooks()}
        />
      )}

      {showProfile && (
        <ProfileModal
          user={user}
          profile={myProfile}
          onClose={() => setShowProfile(false)}
          onPhotoUpdated={(url) => setMyProfile({ ...myProfile, photoURL: url })}
        />
      )}

      {showStats && (
        <StatsScreen
          books={userBooks}
          onClose={() => setShowStats(false)}
          onBookClick={(book) => { setShowStats(false); setBookToEdit(book) }}
        />
      )}
    </div>
  )
}
