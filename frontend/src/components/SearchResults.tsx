import BookCard from './BookCard'
import type { BookResult } from '../types/book'

interface SearchResultsProps {
  results: BookResult[]
  onAdd: (book: BookResult) => void
  addedIds: Set<string>
}

export default function SearchResults({ results, onAdd, addedIds }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-400">Aucun résultat.</p>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((book) => (
        <BookCard key={book.google_books_id} variant="result" book={book} onAdd={onAdd} added={addedIds.has(book.google_books_id)} />
      ))}
    </div>
  )
}
