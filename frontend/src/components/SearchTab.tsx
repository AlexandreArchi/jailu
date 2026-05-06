import { useCallback, useState } from 'react'
import { searchBooks } from '../lib/api'
import { addBook } from '../lib/firestore'
import type { BookResult, BookStatus } from '../types/book'
import SearchBar from './SearchBar'
import SearchResults from './SearchResults'
import AddBookModal from './AddBookModal'

interface SearchTabProps {
  onBookAdded: () => void
}

export default function SearchTab({ onBookAdded }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [bookToAdd, setBookToAdd] = useState<BookResult | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) { setResults([]); return }
    setIsSearching(true)
    setSearchError(null)
    try {
      setResults(await searchBooks(q))
    } catch {
      setSearchError('Erreur lors de la recherche.')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleConfirmAdd = async (status: BookStatus) => {
    if (!bookToAdd) return
    setIsAdding(true)
    try {
      await addBook(bookToAdd, status)
      onBookAdded()
      setBookToAdd(null)
      setQuery('')
      setResults([])
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <h1 className="mb-3 text-lg font-bold text-white">Ajouter un livre</h1>
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        {query ? (
          <SearchResults results={results} onAdd={setBookToAdd} />
        ) : (
          <div className="py-12 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto h-12 w-12 text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <p className="mt-3 text-sm text-slate-600">Recherche un titre, auteur ou ISBN</p>
          </div>
        )}
      </div>

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
