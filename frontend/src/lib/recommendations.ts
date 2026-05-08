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
  return library.map((b) => b.id).sort().join(',')
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Même normalisation pour les auteurs : gère les apostrophes typographiques,
// accents, etc. → "Jean d'Ormesson" === "Jean d'Ormesson"
const normalizeAuthor = normalizeTitle

function bookKey(title: string, author: string): string {
  return `${normalizeTitle(title)}|${normalizeAuthor(author)}`
}

/** True if this search result is already in the user's library (any edition). */
function isOwned(book: BookResult, ownedIds: Set<string>, library: UserBook[]): boolean {
  if (ownedIds.has(book.google_books_id)) return true
  // Same ISBN → same book, different edition
  if (book.isbn13 && library.some((b) => b.isbn13 === book.isbn13)) return true
  if (book.isbn10 && library.some((b) => b.isbn10 === book.isbn10)) return true
  // Same normalised title + normalised first author (gère les variantes d'apostrophes)
  const key = bookKey(book.title, book.authors[0] ?? '')
  return library.some((b) => bookKey(b.title, b.authors[0] ?? '') === key)
}

/** True if we've already picked this book (dedup across query results). */
function isDuplicate(book: BookResult, seen: Set<string>): boolean {
  if (seen.has(book.google_books_id)) return true
  if (book.isbn13 && seen.has(`isbn13:${book.isbn13}`)) return true
  return seen.has(bookKey(book.title, book.authors[0] ?? ''))
}

function markSeen(book: BookResult, seen: Set<string>) {
  seen.add(book.google_books_id)
  if (book.isbn13) seen.add(`isbn13:${book.isbn13}`)
  seen.add(bookKey(book.title, book.authors[0] ?? ''))
}

/**
 * Builds up to 5 diverse book suggestions from the user's library.
 * Enforces: max 2 per query source, max 2 per author in the final list.
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

  const queries: { q: string; reason: string; authorKey?: string }[] = []
  const seenAuthors = new Set<string>()

  // Up to 4 distinct authors from top-rated books
  for (const book of ranked) {
    if (queries.filter((q) => q.authorKey).length >= 4) break
    const author = book.authors[0]
    if (!author) continue
    const aKey = author.toLowerCase()
    if (seenAuthors.has(aKey)) continue
    seenAuthors.add(aKey)
    queries.push({
      q: `inauthor:"${author}"`,
      reason: `Parce que tu as aimé ${book.title}`,
      authorKey: aKey,
    })
  }

  // Top 2 categories (weighted by rating), skip if already covered by author queries
  const catScore: Record<string, { score: number; label: string; book: UserBook }> = {}
  for (const book of ranked) {
    for (const cat of book.tags ?? []) {
      const k = cat.toLowerCase().trim()
      if (!k || k.length < 3) continue
      if (!catScore[k]) catScore[k] = { score: 0, label: cat, book }
      catScore[k].score += book.rating ?? 3
    }
  }
  const topCats = Object.values(catScore).sort((a, b) => b.score - a.score).slice(0, 2)
  for (const { label, book } of topCats) {
    queries.push({
      q: `subject:"${label}"`,
      reason: `Parce que tu aimes ${book.title}`,
    })
  }

  if (queries.length === 0) return []

  // ── Run queries in parallel ──────────────────────────────────────────────

  const ownedIds = new Set(library.map((b) => b.googleBooksId).filter(Boolean))
  const settled = await Promise.allSettled(queries.map(({ q }) => searchBooks(q)))

  // Pre-filter each query's results
  const queryResults: BookResult[][] = settled.map((r) =>
    r.status === 'fulfilled' ? r.value : [],
  )

  // ── Round-robin merge with diversity caps ────────────────────────────────
  // Rules:
  //   - max 1 suggestion per author  → 5 suggestions = 5 auteurs distincts
  //   - max 3 suggestions per query source (l'auteur cap prime)
  //   - skip books explicitly in English (évite les doublons FR/EN)

  const MAX_PER_SOURCE = 3
  const MAX_PER_AUTHOR = 1

  const seen = new Set<string>()
  const countPerSource = new Array<number>(queryResults.length).fill(0)
  const countPerAuthor: Record<string, number> = {}
  const queryIndices = new Array<number>(queryResults.length).fill(0)
  const suggestions: Suggestion[] = []

  // Round-robin: one pick per source per pass
  let progress = true
  while (suggestions.length < 5 && progress) {
    progress = false
    for (let i = 0; i < queryResults.length; i++) {
      if (suggestions.length >= 5) break
      if (countPerSource[i] >= MAX_PER_SOURCE) continue

      // Advance index until we find a valid candidate
      let found = false
      while (queryIndices[i] < queryResults[i].length) {
        const book = queryResults[i][queryIndices[i]++]
        if (isDuplicate(book, seen)) continue
        if (isOwned(book, ownedIds, library)) continue
        // Suggestions : uniquement les livres explicitement en français
        if (book.language !== 'fr') continue

        const authorKey = book.authors[0]?.toLowerCase() ?? '__unknown__'
        if ((countPerAuthor[authorKey] ?? 0) >= MAX_PER_AUTHOR) continue

        // Accept
        markSeen(book, seen)
        countPerSource[i]++
        countPerAuthor[authorKey] = (countPerAuthor[authorKey] ?? 0) + 1
        suggestions.push({ book, reason: queries[i].reason })
        found = true
        progress = true
        break
      }

      if (!found) {
        // Source exhausted — mark as done so we don't loop forever
        countPerSource[i] = MAX_PER_SOURCE
      }
    }
  }

  // ── Score: prefer books with cover + description + french ────────────────

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
