import {
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
  onSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type {
  BookResult, BookStatus, UserBook, UserProfile,
  FriendEntry, FriendRequest, Recommendation, Story,
  FollowEntry, FollowStatus,
} from '../types/book'

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
    quotes: (d.quotes as string[]) ?? [],
    startedAt: toDate(d.startedAt),
    finishedAt: toDate(d.finishedAt),
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
  }
}

function docToFollowEntry(docSnap: { id: string; data: () => Record<string, unknown> }): FollowEntry {
  const d = docSnap.data()
  return {
    uid: docSnap.id,
    username: d.username as string,
    photoURL: (d.photoURL as string | null) ?? null,
    followedAt: toDate(d.followedAt) ?? new Date(),
  }
}

// ── books ─────────────────────────────────────────────────────────────────────

export async function addBook(book: BookResult, status: BookStatus, finishedAt?: Date): Promise<string> {
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
    quotes: [],
    startedAt: status === 'reading' ? now : null,
    finishedAt: status === 'read' ? (finishedAt ?? now) : null,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function addManualBook(
  info: { title: string; authors: string[]; coverUrl: string },
  status: BookStatus,
  finishedAt?: Date,
): Promise<string> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const now = serverTimestamp()
  const booksRef = collection(db, 'users', userId, 'books')
  const docRef = await addDoc(booksRef, {
    googleBooksId: null,
    isbn13: null,
    isbn10: null,
    title: info.title,
    subtitle: null,
    authors: info.authors,
    publisher: null,
    publishedDate: null,
    pageCount: null,
    description: null,
    coverUrl: info.coverUrl,
    thumbnailUrl: null,
    tags: [],
    status,
    rating: null,
    notes: null,
    quotes: [],
    startedAt: status === 'reading' ? now : null,
    finishedAt: status === 'read' ? (finishedAt ?? now) : null,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateBookCover(bookId: string, coverUrl: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  const bookRef = doc(db, 'users', userId, 'books', bookId)
  await updateDoc(bookRef, { coverUrl, thumbnailUrl: null, updatedAt: serverTimestamp() })
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
    quotes?: string[]
    pageCount?: number | null
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
  await setDoc(doc(db, 'users', userId), {
    username,
    photoURL: null,
    bio: null,
    isPublic: true,
    followersCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
  })
}

function docToProfile(uid: string, d: Record<string, unknown>): UserProfile {
  return {
    uid,
    username: d.username as string,
    photoURL: (d.photoURL as string | null) ?? null,
    bio: (d.bio as string | null) ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    readingGoal: (d.readingGoal as { year: number; target: number } | null) ?? null,
    isPublic: (d.isPublic as boolean | undefined) ?? true,
    followersCount: (d.followersCount as number | undefined) ?? 0,
    followingCount: (d.followingCount as number | undefined) ?? 0,
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const userId = auth.currentUser?.uid
  if (!userId) return null
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return docToProfile(userId, snap.data() as Record<string, unknown>)
}

export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return docToProfile(uid, snap.data() as Record<string, unknown>)
}

export async function setProfilePublic(isPublic: boolean): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await updateDoc(doc(db, 'users', userId), { isPublic })
}

export async function setReadingGoal(year: number, target: number | null): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await updateDoc(doc(db, 'users', userId), { readingGoal: target === null ? null : { year, target } })
}

export async function updateUserPhotoURL(photoURL: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await updateDoc(doc(db, 'users', userId), { photoURL })
}

export async function updateBio(bio: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await updateDoc(doc(db, 'users', userId), { bio: bio.trim() || null })
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
  return docToProfile(d.id, d.data() as Record<string, unknown>)
}

// ── follow system ─────────────────────────────────────────────────────────────

export async function followUser(theirUid: string, theirUsername: string, theirPhotoURL?: string | null): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  const myProfile = await getMyProfile()
  if (!myProfile) throw new Error('Profil non trouvé')

  const batch = writeBatch(db)
  const now = serverTimestamp()

  // MY following collection
  batch.set(doc(db, 'users', myUid, 'following', theirUid), {
    username: theirUsername,
    photoURL: theirPhotoURL ?? null,
    followedAt: now,
  })
  // THEIR followers collection
  batch.set(doc(db, 'users', theirUid, 'followers', myUid), {
    username: myProfile.username,
    photoURL: myProfile.photoURL ?? null,
    followedAt: now,
  })
  // Update counters
  batch.update(doc(db, 'users', myUid), { followingCount: increment(1) })
  batch.update(doc(db, 'users', theirUid), { followersCount: increment(1) })

  await batch.commit()
}

export async function unfollowUser(theirUid: string): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')

  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', myUid, 'following', theirUid))
  batch.delete(doc(db, 'users', theirUid, 'followers', myUid))
  batch.update(doc(db, 'users', myUid), { followingCount: increment(-1) })
  batch.update(doc(db, 'users', theirUid), { followersCount: increment(-1) })

  await batch.commit()
}

export async function sendFollowRequest(theirUid: string, _theirUsername: string): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  const myProfile = await getMyProfile()
  if (!myProfile) throw new Error('Profil non trouvé')

  await setDoc(doc(db, 'users', theirUid, 'followRequests', myUid), {
    username: myProfile.username,
    photoURL: myProfile.photoURL ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function cancelFollowRequest(theirUid: string): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  await deleteDoc(doc(db, 'users', theirUid, 'followRequests', myUid))
}

export async function acceptFollowRequest(fromUid: string, fromUsername: string, fromPhotoURL?: string | null): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  const myProfile = await getMyProfile()
  if (!myProfile) throw new Error('Profil non trouvé')

  const batch = writeBatch(db)
  const now = serverTimestamp()

  // Add to my followers
  batch.set(doc(db, 'users', myUid, 'followers', fromUid), {
    username: fromUsername,
    photoURL: fromPhotoURL ?? null,
    followedAt: now,
  })
  // Add to their following
  batch.set(doc(db, 'users', fromUid, 'following', myUid), {
    username: myProfile.username,
    photoURL: myProfile.photoURL ?? null,
    followedAt: now,
  })
  // Remove the request
  batch.delete(doc(db, 'users', myUid, 'followRequests', fromUid))
  // Update counters
  batch.update(doc(db, 'users', myUid), { followersCount: increment(1) })
  batch.update(doc(db, 'users', fromUid), { followingCount: increment(1) })

  await batch.commit()
}

export async function rejectFollowRequest(fromUid: string): Promise<void> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  await deleteDoc(doc(db, 'users', myUid, 'followRequests', fromUid))
}

export async function checkFollowStatus(theirUid: string): Promise<FollowStatus> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')

  const [followingSnap, requestSnap] = await Promise.all([
    getDoc(doc(db, 'users', myUid, 'following', theirUid)),
    getDoc(doc(db, 'users', theirUid, 'followRequests', myUid)),
  ])

  if (followingSnap.exists()) return 'following'
  if (requestSnap.exists()) return 'pending'
  return 'none'
}

export async function getMyFollowing(): Promise<FollowEntry[]> {
  const myUid = auth.currentUser?.uid
  if (!myUid) throw new Error('Non authentifié')
  const snap = await getDocs(collection(db, 'users', myUid, 'following'))
  return snap.docs.map(docToFollowEntry)
}

export async function getFollowers(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'followers'))
  return snap.docs.map(docToFollowEntry)
}

export async function getFollowing(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'following'))
  return snap.docs.map(docToFollowEntry)
}

export function subscribeToFollowing(callback: (entries: FollowEntry[]) => void): () => void {
  const myUid = auth.currentUser?.uid
  if (!myUid) return () => {}
  return onSnapshot(collection(db, 'users', myUid, 'following'), (snap) => {
    callback(snap.docs.map(docToFollowEntry))
  })
}

export function subscribeToFollowRequests(callback: (entries: FollowEntry[]) => void): () => void {
  const myUid = auth.currentUser?.uid
  if (!myUid) return () => {}
  return onSnapshot(collection(db, 'users', myUid, 'followRequests'), (snap) => {
    callback(snap.docs.map((d) => ({
      uid: d.id,
      username: d.data().username as string,
      photoURL: (d.data().photoURL as string | null) ?? null,
      followedAt: toDate(d.data().createdAt) ?? new Date(),
    })))
  })
}

export async function getFriendBooks(friendUid: string): Promise<UserBook[]> {
  const q = query(collection(db, 'users', friendUid, 'books'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(docToUserBook)
}

// ── legacy friend helpers (kept for backward compat / migration) ──────────────

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

export function subscribeToPendingRequests(callback: (reqs: FriendRequest[]) => void): () => void {
  const userId = auth.currentUser?.uid
  if (!userId) return () => {}
  return onSnapshot(collection(db, 'users', userId, 'friendRequests'), (snap) => {
    callback(snap.docs.map((d) => ({
      uid: d.id,
      username: d.data().fromUsername as string,
      createdAt: toDate(d.data().createdAt) ?? new Date(),
    })))
  })
}

export function subscribeToFriends(callback: (friends: FriendEntry[]) => void): () => void {
  const userId = auth.currentUser?.uid
  if (!userId) return () => {}
  return onSnapshot(collection(db, 'users', userId, 'friends'), (snap) => {
    callback(snap.docs.map((d) => ({
      uid: d.id,
      username: d.data().username as string,
      since: toDate(d.data().since) ?? new Date(),
    })))
  })
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

// ── recommendations ───────────────────────────────────────────────────────────

export async function sendRecommendation(
  toUid: string,
  book: { title: string; authors: string[]; coverUrl: string; thumbnailUrl: string | null; googleBooksId: string | null },
  message: string | null,
  fromUsername: string,
): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await addDoc(collection(db, 'users', toUid, 'recommendations'), {
    bookTitle: book.title,
    bookAuthors: book.authors,
    bookCoverUrl: book.coverUrl,
    bookThumbnailUrl: book.thumbnailUrl ?? null,
    googleBooksId: book.googleBooksId ?? null,
    fromUid: userId,
    fromUsername,
    message: message ?? null,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToRecommendations(callback: (recs: Recommendation[]) => void): () => void {
  const userId = auth.currentUser?.uid
  if (!userId) return () => {}
  const q = query(collection(db, 'users', userId, 'recommendations'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({
      id: d.id,
      bookTitle: d.data().bookTitle as string,
      bookAuthors: d.data().bookAuthors as string[],
      bookCoverUrl: d.data().bookCoverUrl as string,
      bookThumbnailUrl: (d.data().bookThumbnailUrl as string | null) ?? null,
      googleBooksId: (d.data().googleBooksId as string | null) ?? null,
      fromUid: d.data().fromUid as string,
      fromUsername: d.data().fromUsername as string,
      message: (d.data().message as string | null) ?? null,
      createdAt: toDate(d.data().createdAt) ?? new Date(),
    })))
  })
}

export async function deleteRecommendation(id: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await deleteDoc(doc(db, 'users', userId, 'recommendations', id))
}

// ── stories ───────────────────────────────────────────────────────────────────

export async function createStory(
  book: { title: string; authors: string[]; coverUrl: string; thumbnailUrl: string | null; googleBooksId: string | null },
  rating: number | null,
): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Non authentifié')
  await addDoc(collection(db, 'users', userId, 'stories'), {
    bookTitle: book.title,
    bookAuthors: book.authors,
    bookCoverUrl: book.coverUrl,
    bookThumbnailUrl: book.thumbnailUrl ?? null,
    googleBooksId: book.googleBooksId ?? null,
    rating: rating ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function getMyStories(): Promise<Story[]> {
  const userId = auth.currentUser?.uid
  if (!userId) return []
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const q = query(
    collection(db, 'users', userId, 'stories'),
    where('createdAt', '>=', sevenDaysAgo),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    id: d.id,
    fromUid: userId,
    fromUsername: '',
    bookTitle: d.data().bookTitle as string,
    bookAuthors: d.data().bookAuthors as string[],
    bookCoverUrl: d.data().bookCoverUrl as string,
    bookThumbnailUrl: (d.data().bookThumbnailUrl as string | null) ?? null,
    googleBooksId: (d.data().googleBooksId as string | null) ?? null,
    rating: (d.data().rating as number | null) ?? null,
    createdAt: toDate(d.data().createdAt) ?? new Date(),
  }))
}

export async function getFriendsStories(friends: Array<{ uid: string; username: string }>): Promise<Story[]> {
  if (friends.length === 0) return []
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const results = await Promise.all(
    friends.map(async ({ uid, username }) => {
      try {
        const q = query(
          collection(db, 'users', uid, 'stories'),
          where('createdAt', '>=', sevenDaysAgo),
          orderBy('createdAt', 'desc'),
        )
        const snap = await getDocs(q)
        return snap.docs.map((d) => ({
          id: d.id,
          fromUid: uid,
          fromUsername: username,
          bookTitle: d.data().bookTitle as string,
          bookAuthors: d.data().bookAuthors as string[],
          bookCoverUrl: d.data().bookCoverUrl as string,
          bookThumbnailUrl: (d.data().bookThumbnailUrl as string | null) ?? null,
          googleBooksId: (d.data().googleBooksId as string | null) ?? null,
          rating: (d.data().rating as number | null) ?? null,
          createdAt: toDate(d.data().createdAt) ?? new Date(),
        }))
      } catch {
        return []
      }
    }),
  )
  return results.flat()
}

export async function deleteMyStory(storyId: string): Promise<void> {
  const userId = auth.currentUser?.uid
  if (!userId) return
  await deleteDoc(doc(db, 'users', userId, 'stories', storyId))
}

// ── public profile (no auth required) ────────────────────────────────────────

export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('username', '==', username))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return docToProfile(d.id, d.data() as Record<string, unknown>)
}

export async function getPublicBooks(uid: string): Promise<UserBook[]> {
  const q = query(collection(db, 'users', uid, 'books'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(docToUserBook)
}
