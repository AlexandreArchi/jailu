import type { BookResult } from '../types/book'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function searchBooks(query: string): Promise<BookResult[]> {
  const url = `${API_BASE_URL}/api/books/search?q=${encodeURIComponent(query)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erreur recherche : ${response.status}`)
  }
  return response.json() as Promise<BookResult[]>
}

export interface SuggestionRaw {
  book: BookResult
  reason: string
  source_title: string
  source_author: string
}

export async function getSuggestions(params: {
  read_books: { title: string; author: string; rating: number }[]
  owned_titles: string[]
}): Promise<SuggestionRaw[]> {
  const res = await fetch(`${API_BASE_URL}/api/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Erreur suggestions : ${res.status}`)
  return res.json() as Promise<SuggestionRaw[]>
}
