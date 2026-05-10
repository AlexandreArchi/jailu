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

export async function getSuggestionReason(params: {
  sourceTitle: string
  sourceAuthor: string
  suggestedTitle: string
  suggestedAuthor: string
  suggestedDescription?: string | null
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/suggestions/reason`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_title: params.sourceTitle,
        source_author: params.sourceAuthor,
        suggested_title: params.suggestedTitle,
        suggested_author: params.suggestedAuthor,
        suggested_description: params.suggestedDescription ?? null,
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { reason: string | null }
    return data.reason
  } catch {
    return null
  }
}
