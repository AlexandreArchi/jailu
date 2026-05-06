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
