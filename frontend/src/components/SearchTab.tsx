import { useCallback, useState } from 'react'
import { searchBooks } from '../lib/api'
import { addBook } from '../lib/firestore'
import type { BookResult, BookStatus } from '../types/book'
import SearchBar from './SearchBar'
import SearchResults from './SearchResults'
import AddBookModal from './AddBookModal'
import ScanModal from './ScanModal'

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
  const [showScan, setShowScan] = useState(false)

  const runSearch = useCallback(async (q: string) => {
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

  const handleScan = useCallback(
    (isbn: string) => {
      setShowScan(false)
      void runSearch(`isbn:${isbn}`)
    },
    [runSearch],
  )

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
    <div className="flex min-h-0 flex-1 flex-col pb-24">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Ajouter un livre</h1>
          <button
            onClick={() => setShowScan(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-11h-3a1 1 0 00-1 1v3" />
              <rect x="8" y="8" width="8" height="8" rx="1" strokeLinecap="round" />
            </svg>
            Scanner
          </button>
        </div>
        <SearchBar onSearch={runSearch} isLoading={isSearching} />
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
            <p className="mt-1 text-xs text-slate-700">ou scanne le code-barres du livre</p>
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

      {showScan && <ScanModal onScan={handleScan} onClose={() => setShowScan(false)} />}
    </div>
  )
}
