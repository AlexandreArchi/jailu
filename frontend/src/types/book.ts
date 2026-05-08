export type BookStatus = 'read' | 'reading' | 'to_read'

export interface UserProfile {
  uid: string
  username: string
  photoURL: string | null
  createdAt: Date
  readingGoal?: { year: number; target: number } | null
  isPublic?: boolean
}

export interface FriendEntry {
  uid: string
  username: string
  since: Date
}

export interface FriendRequest {
  uid: string
  username: string
  createdAt: Date
}

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  read: 'Lu',
  reading: 'En cours',
  to_read: 'À lire',
}

export interface BookResult {
  google_books_id: string
  isbn13: string | null
  isbn10: string | null
  title: string
  subtitle: string | null
  authors: string[]
  publisher: string | null
  published_date: string | null
  page_count: number | null
  description: string | null
  cover_url: string
  thumbnail_url: string | null
  categories: string[]
}

export interface Story {
  id: string
  fromUid: string
  fromUsername: string
  bookTitle: string
  bookAuthors: string[]
  bookCoverUrl: string
  bookThumbnailUrl: string | null
  googleBooksId: string | null
  rating: number | null
  createdAt: Date
}

export interface Recommendation {
  id: string
  bookTitle: string
  bookAuthors: string[]
  bookCoverUrl: string
  bookThumbnailUrl: string | null
  googleBooksId: string | null
  fromUid: string
  fromUsername: string
  message: string | null
  createdAt: Date
}

export interface UserBook {
  id: string
  googleBooksId: string
  isbn13: string | null
  isbn10: string | null
  title: string
  subtitle: string | null
  authors: string[]
  publisher: string | null
  publishedDate: string | null
  pageCount: number | null
  description: string | null
  coverUrl: string
  thumbnailUrl: string | null
  status: BookStatus
  rating: number | null
  notes: string | null
  quotes: string[]
  tags: string[]
  startedAt: Date | null
  finishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
