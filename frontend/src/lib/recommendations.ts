import type { BookResult, UserBook } from '../types/book'
import { getSuggestions } from './api'
import { auth } from './firebase'

export interface Suggestion {
  book: BookResult
  reason: string
  sourceTitle: string
  sourceAuthor: string
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 h
const STORAGE_KEY = 'jailu_suggestions_cache'

type CacheEntry = { key: string; suggestions: Suggestion[]; at: number }

// Module-level cache (survit aux changements de tab)
let _mem: CacheEntry | null = null

function _loadFromStorage(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch { return null }
}

function _saveToStorage(entry: CacheEntry) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)) } catch {}
}

function _getCache(): CacheEntry | null {
  if (_mem) return _mem
  const stored = _loadFromStorage()
  if (stored) { _mem = stored }
  return _mem
}

function _setCache(entry: CacheEntry) {
  _mem = entry
  _saveToStorage(entry)
}

function buildCacheKey(library: UserBook[]): string {
  const uid = auth.currentUser?.uid ?? ''
  return `${uid}:${library.map((b) => b.id).sort().join(',')}`
}

/**
 * Fetches up to 3 personalised book suggestions via Groq + Google Books.
 * Results are cached 24 h in localStorage + module scope.
 */
export async function getRecommendations(library: UserBook[]): Promise<Suggestion[]> {
  const readBooks = library.filter((b) => b.status === 'read')
  if (readBooks.length === 0) return []

  const key = buildCacheKey(library)
  const cached = _getCache()
  if (cached && cached.key === key && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.suggestions
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
    _setCache({ key, suggestions, at: Date.now() })
    return suggestions
  } catch {
    return []
  }
}

export function invalidateRecommendationsCache() {
  _mem = null
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}
