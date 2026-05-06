import { useCallback, useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getUserBooks } from '../lib/firestore'
import BottomNav from '../components/BottomNav'
import HomeTab from '../components/HomeTab'
import ToReadTab from '../components/ToReadTab'
import ReadTab from '../components/ReadTab'
import SearchTab from '../components/SearchTab'
import BookDetailModal from '../components/BookDetailModal'
import StatsScreen from '../components/StatsScreen'
import type { UserBook } from '../types/book'

type Tab = 'home' | 'to_read' | 'read' | 'search'

interface LibraryPageProps {
  user: User
}

export default function LibraryPage({ user }: LibraryPageProps) {
  const displayName = user.displayName ?? user.email ?? 'Lecteur'

  const [userBooks, setUserBooks] = useState<UserBook[]>([])
  const [isBooksLoading, setIsBooksLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [bookToEdit, setBookToEdit] = useState<UserBook | null>(null)
  const [showStats, setShowStats] = useState(false)

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

  const handleBookClick = (book: UserBook) => setBookToEdit(book)

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-800/80 px-4 pt-12 pb-3 sm:pt-6 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">JAILU</span>
          <button
            onClick={() => void signOut(auth)}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-500 transition hover:text-slate-300"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tab content */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        {activeTab === 'home' && (
          <HomeTab
            books={userBooks}
            isLoading={isBooksLoading}
            displayName={displayName}
            onBookClick={handleBookClick}
            onGoToTab={(tab) => setActiveTab(tab)}
            onShowStats={() => setShowStats(true)}
          />
        )}
        {activeTab === 'to_read' && (
          <ToReadTab books={userBooks} onBookClick={handleBookClick} />
        )}
        {activeTab === 'read' && (
          <ReadTab
            books={userBooks}
            onBookClick={handleBookClick}
            onShowStats={() => setShowStats(true)}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab onBookAdded={() => void loadBooks()} />
        )}
      </div>

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        toReadCount={toReadCount}
        readCount={readCount}
      />

      {bookToEdit !== null && (
        <BookDetailModal
          book={bookToEdit}
          onClose={() => setBookToEdit(null)}
          onUpdated={() => void loadBooks()}
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
