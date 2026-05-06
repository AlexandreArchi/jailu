import { useCallback, useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { searchBooks } from '../lib/api'
import { addBook, getUserBooks } from '../lib/firestore'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import BookCard from '../components/BookCard'
import AddBookModal from '../components/AddBookModal'
import BookDetailModal from '../components/BookDetailModal'
import type { BookResult, BookStatus, UserBook } from '../types/book'
import { BOOK_STATUS_LABELS } from '../types/book'

interface LibraryPageProps {
  user: User
}

type FilterTab = 'all' | BookStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'read', label: BOOK_STATUS_LABELS.read },
  { key: 'reading', label: BOOK_STATUS_LABELS.reading },
  { key: 'to_read', label: BOOK_STATUS_LABELS.to_read },
]

export default function LibraryPage({ user }: LibraryPageProps) {
  const displayName = user.displayName ?? user.email ?? 'Lecteur'

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [userBooks, setUserBooks] = useState<UserBook[]>([])
  const [isBooksLoading, setIsBooksLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const [bookToAdd, setBookToAdd] = useState<BookResult | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [bookToEdit, setBookToEdit] = useState<UserBook | null>(null)

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

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) { setSearchResults([]); return }
    setIsSearching(true)
    setSearchError(null)
    try {
      setSearchResults(await searchBooks(q))
    } catch {
      setSearchError('Erreur lors de la recherche.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleConfirmAdd = async (status: BookStatus) => {
    if (!bookToAdd) return
    setIsAdding(true)
    try {
      await addBook(bookToAdd, status)
      await loadBooks()
      setBookToAdd(null)
      setQuery('')
      setSearchResults([])
    } finally {
      setIsAdding(false)
    }
  }

  const filteredBooks = activeTab === 'all'
    ? userBooks
    : userBooks.filter((b) => b.status === activeTab)

  const counts = {
    all: userBooks.length,
    read: userBooks.filter((b) => b.status === 'read').length,
    reading: userBooks.filter((b) => b.status === 'reading').length,
    to_read: userBooks.filter((b) => b.status === 'to_read').length,
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tracking-tight text-indigo-400">JAILU</span>
            {userBooks.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                {counts.read} lu{counts.read > 1 ? 's' : ''} · {counts.reading} en cours · {counts.to_read} à lire
              </p>
            )}
          </div>
          <button
            onClick={() => void signOut(auth)}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-lg space-y-4">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />

          {searchError !== null && (
            <p className="text-sm text-red-400">{searchError}</p>
          )}

          {query ? (
            <SearchResults results={searchResults} onAdd={setBookToAdd} />
          ) : isBooksLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            </div>
          ) : userBooks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold">Bonjour {displayName}, ta bibliothèque est vide.</p>
              <p className="mt-2 text-slate-400">Recherche un livre pour commencer.</p>
            </div>
          ) : (
            <>
              {/* Onglets de filtre */}
              <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                      activeTab === key
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                    {counts[key] > 0 && (
                      <span className="ml-1 opacity-70">{counts[key]}</span>
                    )}
                  </button>
                ))}
              </div>

              {filteredBooks.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aucun livre dans cette catégorie.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      variant="library"
                      book={book}
                      onClick={setBookToEdit}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {bookToAdd !== null && (
        <AddBookModal
          book={bookToAdd}
          onConfirm={isAdding ? () => undefined : handleConfirmAdd}
          onClose={() => setBookToAdd(null)}
        />
      )}

      {bookToEdit !== null && (
        <BookDetailModal
          book={bookToEdit}
          onClose={() => setBookToEdit(null)}
          onUpdated={() => void loadBooks()}
        />
      )}
    </div>
  )
}
