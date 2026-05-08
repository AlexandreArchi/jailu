import { searchBooks } from './api'
import type { BookResult, UserBook } from '../types/book'

export interface Suggestion {
  book: BookResult
  reason: string
}

// Module-level cache to survive tab switches
let _cache: { key: string; suggestions: Suggestion[]; at: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 h

function buildCacheKey(library: UserBook[]): string {
  const ids = library.map((b) => b.id).sort().join(',')
  return ids
}

/**
 * Builds up to 5 personalised book suggestions from the user's library.
 * Uses only the existing Google Books API — no new backend needed.
 */
export async function getRecommendations(library: UserBook[]): Promise<Suggestion[]> {
  const readBooks = library.filter((b) => b.status === 'read')
  if (readBooks.length === 0) return []

  const key = buildCacheKey(library)
  if (_cache && _cache.key === key && Date.now() - _cache.at < CACHE_TTL_MS) {
    return _cache.suggestions
  }

  // Sort reads: rating desc, then recency desc
  const ranked = [...readBooks].sort((a, b) => {
    const rA = a.rating ?? 3
    const rB = b.rating ?? 3
    if (rB !== rA) return rB - rA
    return (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0)
  })

  // ── Build candidate queries ──────────────────────────────────────────────

  const queries: { q: string; reason: string }[] = []

  // Top 2 authors (from top-rated books)
  const seenAuthors = new Set<string>()
  for (const book of ranked) {
    const author = book.authors[0]
    if (!author || seenAuthors.has(author)) continue
    seenAuthors.add(author)
    queries.push({
      q: `inauthor:"${author}"`,
      reason: `Parce que tu as aimé ${book.title}`,
    })
    if (queries.length >= 2) break
  }

  // Top 2 categories (weighted by rating)
  const catScore: Record<string, { score: number; label: string; book: UserBook }> = {}
  for (const book of ranked) {
    for (const cat of book.tags ?? []) {
      const key = cat.toLowerCase().trim()
      if (!key || key.length < 3) continue
      if (!catScore[key]) catScore[key] = { score: 0, label: cat, book }
      catScore[key].score += book.rating ?? 3
    }
  }
  const topCats = Object.values(catScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  for (const { label, book } of topCats) {
    queries.push({
      q: `subject:"${label}"`,
      reason: `Parce que tu aimes ${book.title}`,
    })
  }

  // Fallback: if no categories found, use more authors
  if (topCats.length === 0) {
    let count = 0
    for (const book of ranked.slice(2)) {
      const author = book.authors[0]
      if (!author || seenAuthors.has(author)) continue
      seenAuthors.add(author)
      queries.push({
        q: `inauthor:"${author}"`,
        reason: `Parce que tu as aimé ${book.title}`,
      })
      if (++count >= 2) break
    }
  }

  if (queries.length === 0) return []

  // ── Run queries in parallel ──────────────────────────────────────────────

  const ownedIds = new Set(library.map((b) => b.googleBooksId).filter(Boolean))

  const settled = await Promise.allSettled(queries.map(({ q }) => searchBooks(q)))

  const seen = new Set<string>()
  const suggestions: Suggestion[] = []

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    if (result.status !== 'fulfilled') continue
    const reason = queries[i].reason

    for (const book of result.value) {
      if (seen.has(book.google_books_id)) continue
      if (ownedIds.has(book.google_books_id)) continue
      // Skip books whose title/author is already in library (same book, different edition)
      const titleLower = book.title.toLowerCase()
      const alreadyOwned = library.some(
        (b) => b.title.toLowerCase() === titleLower && b.authors[0] === book.authors[0],
      )
      if (alreadyOwned) continue

      seen.add(book.google_books_id)
      suggestions.push({ book, reason })
    }
  }

  // ── Score: prefer books with cover + description ─────────────────────────

  suggestions.sort((a, b) => {
    let sA = 0
    let sB = 0
    if (a.book.language === 'fr') sA += 3
    if (b.book.language === 'fr') sB += 3
    if (a.book.cover_url) sA += 2
    if (b.book.cover_url) sB += 2
    if (a.book.description) sA += 1
    if (b.book.description) sB += 1
    return sB - sA
  })

  const final = suggestions.slice(0, 5)
  _cache = { key, suggestions: final, at: Date.now() }
  return final
}

export function invalidateRecommendationsCache() {
  _cache = null
}
