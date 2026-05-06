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
} from 'firebase/firestore'
import { auth } from './firebase'
import type { BookResult, BookStatus, UserBook } from '../types/book'

const db = getFirestore(auth.app)

export async function addBook(book: BookResult, status: BookStatus): Promise<string> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

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
    status,
    rating: null,
    notes: null,
    tags: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    const data = docSnap.data()
    return {
      id: docSnap.id,
      googleBooksId: data.googleBooksId as string,
      isbn13: data.isbn13 as string | null,
      isbn10: data.isbn10 as string | null,
      title: data.title as string,
      subtitle: data.subtitle as string | null,
      authors: data.authors as string[],
      publisher: data.publisher as string | null,
      publishedDate: data.publishedDate as string | null,
      pageCount: data.pageCount as number | null,
      description: data.description as string | null,
      coverUrl: data.coverUrl as string,
      status: data.status as BookStatus,
      rating: data.rating as number | null,
      notes: data.notes as string | null,
      tags: data.tags as string[],
      createdAt: data.createdAt?.toDate() as Date,
      updatedAt: data.updatedAt?.toDate() as Date,
    }
  })
}

export async function updateBook(
  bookId: string,
  fields: { status?: BookStatus; rating?: number | null; notes?: string | null },
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
