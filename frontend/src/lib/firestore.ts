import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { auth } from './firebase'
import type { BookResult, BookStatus, UserBook } from '../types/book'

const db = getFirestore(auth.app)

export async function addBook(book: BookResult, status: BookStatus): Promise<string> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

  const now = serverTimestamp()
  const booksRef = collection(db, 'users', userId, 'books')
  const docRef = await addDoc(booksRef, {
    googleBooksId: book.google_books_id,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
    title: book.title,
    subtitle: book.subtitle ?? null,
    authors: book.authors,
    publisher: book.publisher ?? null,
    publishedDate: book.published_date ?? null,
    pageCount: book.page_count ?? null,
    description: book.description ?? null,
    coverUrl: book.cover_url,
    thumbnailUrl: book.thumbnail_url ?? null,
    tags: book.categories ?? [],
    status,
    rating: null,
    notes: null,
    startedAt: status === 'reading' ? now : null,
    finishedAt: status === 'read' ? now : null,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function getUserBooks(): Promise<UserBook[]> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

  const booksRef = collection(db, 'users', userId, 'books')
  const q = query(booksRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    const toDate = (v: unknown): Date | null => {
      if (!v) return null
      if (v instanceof Timestamp) return v.toDate()
      return null
    }
    return {
      id: docSnap.id,
      googleBooksId: d.googleBooksId as string,
      isbn13: d.isbn13 as string | null,
      isbn10: d.isbn10 as string | null,
      title: d.title as string,
      subtitle: d.subtitle as string | null,
      authors: d.authors as string[],
      publisher: d.publisher as string | null,
      publishedDate: d.publishedDate as string | null,
      pageCount: d.pageCount as number | null,
      description: d.description as string | null,
      coverUrl: d.coverUrl as string,
      thumbnailUrl: (d.thumbnailUrl as string | null) ?? null,
      tags: (d.tags as string[]) ?? [],
      status: d.status as BookStatus,
      rating: d.rating as number | null,
      notes: d.notes as string | null,
      startedAt: toDate(d.startedAt),
      finishedAt: toDate(d.finishedAt),
      createdAt: toDate(d.createdAt) ?? new Date(),
      updatedAt: toDate(d.updatedAt) ?? new Date(),
    }
  })
}

export async function updateBook(
  bookId: string,
  fields: {
    status?: BookStatus
    rating?: number | null
    notes?: string | null
    startedAt?: Date | null
    finishedAt?: Date | null
  },
): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

  const bookRef = doc(db, 'users', userId, 'books', bookId)
  await updateDoc(bookRef, { ...fields, updatedAt: serverTimestamp() })
}

export async function deleteBook(bookId: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

  const bookRef = doc(db, 'users', userId, 'books', bookId)
  await deleteDoc(bookRef)
}
