import type { BookResult, UserBook } from '../types/book'
import { getSuggestions } from './api'
import { auth } from './firebase'

export interface Suggestion {
  book: BookResult
  reason: string
  sourceTitle: string
  sourceAuthor: string
}

// Module-level cache to survive tab switches
let _cache: { key: string; suggestions: Suggestion[]; at: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 h

function buildCacheKey(library: UserBook[]): string {
  const uid = auth.currentUser?.uid ?? ''
  return `${uid}:${library.map((b) => b.id).sort().join(',')}`
}

/**
 * Fetches up to 5 personalised book suggestions via Groq + Google Books.
 * Results are cached for 1 hour in module scope.
 */
export async function getRecommendations(library: UserBook[]): Promise<Suggestion[]> {
  const readBooks = library.filter((b) => b.status === 'read')
  if (readBooks.length === 0) return []

  const key = buildCacheKey(library)
  if (_cache && _cache.key === key && Date.now() - _cache.at < CACHE_TTL_MS) {
    return _cache.suggestions
  }

  // Sort by rating desc, then recency desc
  const ranked = [...readBooks].sort((a, b) => {
    const rA = a.rating ?? 3
    const rB = b.rating ?? 3
    if (rB !== rA) return rB - rA
    return (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0)
  })

  const topBooks = ranked.slice(0, 8).map((b) => ({
    title: b.title,
    author: b.authors[0] ?? '',
    rating: b.rating ?? 3,
  }))

  const ownedTitles = library.map((b) => b.title)

  try {
    const raw = await getSuggestions({ read_books: topBooks, owned_titles: ownedTitles })
    const suggestions: Suggestion[] = raw.map((r) => ({
      book: r.book,
      reason: r.reason,
      sourceTitle: r.source_title,
      sourceAuthor: r.source_author,
    }))
    _cache = { key, suggestions, at: Date.now() }
    return suggestions
  } catch {
    return []
  }
}

export function invalidateRecommendationsCache() {
  _cache = null
}
