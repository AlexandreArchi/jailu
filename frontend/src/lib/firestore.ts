import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { auth } from './firebase'
import type { BookResult, BookStatus, UserBook, UserProfile, FriendEntry, FriendRequest } from '../types/book'

const db = getFirestore(auth.app)

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Timestamp) return v.toDate()
  return null
}

function docToUserBook(docSnap: { id: string; data: () => Record<string, unknown> }): UserBook {
  const d = docSnap.data()
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
}

// ── books ─────────────────────────────────────────────────────────────────────

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

  const q = query(collection(db, 'users', userId, 'books'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(docToUserBook)
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

  await deleteDoc(doc(db, 'users', userId, 'books', bookId))
}

// ── profiles ──────────────────────────────────────────────────────────────────

export async function createUserProfile(username: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await setDoc(doc(db, 'users', userId), { username, createdAt: serverTimestamp() })
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const userId = auth.currentUser?.uid
  if (!userId) return null
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  const d = snap.data()
  return { uid: userId, username: d.username as string, createdAt: toDate(d.createdAt) ?? new Date() }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('username', '==', username))
  const snap = await getDocs(q)
  return snap.empty
}

export async function searchUserByUsername(username: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('username', '==', username))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { uid: d.id, username: d.data().username as string, createdAt: toDate(d.data().createdAt) ?? new Date() }
}

// ── friend requests ───────────────────────────────────────────────────────────

export async function sendFriendRequest(toUid: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const myProfile = await getMyProfile()
  if (!myProfile) throw new Error('Profil non trouvé')
  await setDoc(doc(db, 'users', toUid, 'friendRequests', userId), {
    fromUsername: myProfile.username,
    createdAt: serverTimestamp(),
  })
}

export async function cancelFriendRequest(toUid: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await deleteDoc(doc(db, 'users', toUid, 'friendRequests', userId))
}

export async function getPendingRequests(): Promise<FriendRequest[]> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const snap = await getDocs(collection(db, 'users', userId, 'friendRequests'))
  return snap.docs.map((d) => ({
    uid: d.id,
    username: d.data().fromUsername as string,
    createdAt: toDate(d.data().createdAt) ?? new Date(),
  }))
}

export async function acceptFriendRequest(fromUid: string, fromUsername: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const myProfile = await getMyProfile()
  if (!myProfile) throw new Error('Profil non trouvé')

  const batch = writeBatch(db)
  const now = serverTimestamp()
  batch.set(doc(db, 'users', userId, 'friends', fromUid), { username: fromUsername, since: now })
  batch.set(doc(db, 'users', fromUid, 'friends', userId), { username: myProfile.username, since: now })
  batch.delete(doc(db, 'users', userId, 'friendRequests', fromUid))
  await batch.commit()
}

export async function rejectFriendRequest(fromUid: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await deleteDoc(doc(db, 'users', userId, 'friendRequests', fromUid))
}

// ── friends ───────────────────────────────────────────────────────────────────

export async function getMyFriends(): Promise<FriendEntry[]> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const snap = await getDocs(collection(db, 'users', userId, 'friends'))
  return snap.docs.map((d) => ({
    uid: d.id,
    username: d.data().username as string,
    since: toDate(d.data().since) ?? new Date(),
  }))
}

export async function removeFriend(friendUid: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', userId, 'friends', friendUid))
  batch.delete(doc(db, 'users', friendUid, 'friends', userId))
  await batch.commit()
}

export type FriendshipStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received'

export async function checkFriendshipStatus(otherUid: string): Promise<FriendshipStatus> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')

  const [friendSnap, sentSnap, receivedSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId, 'friends', otherUid)),
    getDoc(doc(db, 'users', otherUid, 'friendRequests', userId)),
    getDoc(doc(db, 'users', userId, 'friendRequests', otherUid)),
  ])

  if (friendSnap.exists()) return 'friends'
  if (sentSnap.exists()) return 'pending_sent'
  if (receivedSnap.exists()) return 'pending_received'
  return 'none'
}

export async function getFriendBooks(friendUid: string): Promise<UserBook[]> {
  const q = query(collection(db, 'users', friendUid, 'books'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(docToUserBook)
}
