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
import type { BookResult, BookStatus, UserBook } from '../types/book'

interface LibraryPageProps {
  user: User
}

export default function LibraryPage({ user }: LibraryPageProps) {
  const displayName = user.displayName ?? user.email ?? 'Lecteur'

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [userBooks, setUserBooks] = useState<UserBook[]>([])
  const [isBooksLoading, setIsBooksLoading] = useState(true)

  const [bookToAdd, setBookToAdd] = useState<BookResult | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    getUserBooks()
      .then(setUserBooks)
      .catch(() => setUserBooks([]))
      .finally(() => setIsBooksLoading(false))
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setSearchError(null)
    try {
      const results = await searchBooks(q)
      setSearchResults(results)
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
      const updated = await getUserBooks()
      setUserBooks(updated)
      setBookToAdd(null)
      setQuery('')
      setSearchResults([])
    } catch {
      // silencieux — le livre n'est pas ajouté
    } finally {
      setIsAdding(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-indigo-400">JAILU</span>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600 hover:text-white"
        >
          Déconnexion
        </button>
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
              <p className="text-lg font-semibold">
                Bonjour {displayName}, ta bibliothèque est vide.
              </p>
              <p className="mt-2 text-slate-400">
                Recherche un livre pour commencer.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {userBooks.map((book) => (
                <BookCard key={book.id} variant="library" book={book} />
              ))}
            </div>
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
    </div>
  )
}
