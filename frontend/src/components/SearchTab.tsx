import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { searchBooks } from '../lib/api'
import { addBook } from '../lib/firestore'
import type { BookResult, BookStatus } from '../types/book'
import SearchBar from './SearchBar'
import SearchResults from './SearchResults'
import AddBookModal from './AddBookModal'
import ManualAddModal from './ManualAddModal'
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
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [showManual, setShowManual] = useState(false)

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
      void runSearch(isbn)
    },
    [runSearch],
  )

  const [addError, setAddError] = useState<string | null>(null)

  const handleConfirmAdd = async (status: BookStatus, finishedAt?: Date) => {
    if (!bookToAdd) return
    setIsAdding(true)
    setAddError(null)
    try {
      await addBook(bookToAdd, status, finishedAt)
      onBookAdded()
      setAddedIds((prev) => new Set([...prev, bookToAdd.google_books_id]))
      setBookToAdd(null)
    } catch (err) {
      console.error('[addBook] échec:', err)
      setAddError('Impossible d\'ajouter le livre. Réessaie.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Rechercher un livre</h1>
          <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            Manuel
          </button>
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
        </div>
        <SearchBar onSearch={runSearch} isLoading={isSearching} />
        {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24">
        {query ? (
          <SearchResults results={results} onAdd={setBookToAdd} addedIds={addedIds} />
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

      {showScan && <ScanModal onScan={handleScan} onClose={() => setShowScan(false)} />}
      {showManual && (
        <ManualAddModal
          onAdded={() => { onBookAdded(); setShowManual(false) }}
          onClose={() => setShowManual(false)}
        />
      )}

      {bookToAdd !== null && createPortal(
        <AddBookModal
          book={bookToAdd}
          onConfirm={isAdding ? () => undefined : handleConfirmAdd}
          onClose={() => { setBookToAdd(null); setAddError(null) }}
          error={addError}
        />,
        document.body
      )}
    </div>
  )
}
