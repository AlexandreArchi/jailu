import { useEffect, useState } from 'react'
import { getProfileByUsername, getPublicBooks } from '../lib/firestore'
import type { UserProfile, UserBook } from '../types/book'

interface Props {
  username: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          fill={n <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-3 w-3 ${n <= rating ? 'text-amber-400' : 'text-slate-600'}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  )
}

function BookCover({ book }: { book: UserBook }) {
  const [src, setSrc] = useState(book.coverUrl)
  const fallback = book.thumbnailUrl ?? ''

  return (
    <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-800">
      {src ? (
        <img
          src={src}
          alt={book.title}
          className="h-full w-full object-cover"
          onError={() => { if (src !== fallback) setSrc(fallback) }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2">
          <span className="text-center text-[10px] text-slate-500 leading-tight">{book.title}</span>
        </div>
      )}
    </div>
  )
}

export default function PublicProfilePage({ username }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [books, setBooks] = useState<UserBook[]>([])
  const [status, setStatus] = useState<'loading' | 'notFound' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const p = await getProfileByUsername(username)
        if (cancelled) return
        if (!p) { setStatus('notFound'); return }
        setProfile(p)
        const allBooks = await getPublicBooks(p.uid)
        if (cancelled) return
        setBooks(allBooks.filter((b) => b.status === 'read'))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('notFound')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [username])

  const totalPages = books.reduce((acc, b) => acc + (b.pageCount ?? 0), 0)
  const initial = profile?.username[0].toUpperCase() ?? '?'

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    )
  }

  // ── Not found ──
  if (status === 'notFound' || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <LogoMark />
        <p className="text-lg font-semibold text-white">Profil introuvable</p>
        <p className="text-sm text-slate-400">@{username} n'existe pas ou n'a pas encore de profil public.</p>
        <a
          href="https://jailu-prod.web.app"
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Ouvrir JAILU
        </a>
      </div>
    )
  }

  // ── Ready ──
  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-center px-4 pt-10 pb-6">
        <LogoMark />
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center px-6 pb-6">
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt={profile.username}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-indigo-500/40 mb-3"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20 ring-2 ring-indigo-500/40 mb-3">
            <span className="text-3xl font-bold text-indigo-400">{initial}</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-white">@{profile.username}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
          <span><span className="font-semibold text-white">{books.length}</span> livres lus</span>
          {totalPages > 0 && (
            <span><span className="font-semibold text-white">{totalPages.toLocaleString('fr-FR')}</span> pages</span>
          )}
        </div>
      </div>

      {/* Books grid */}
      {books.length === 0 ? (
        <div className="px-6 pt-4 text-center text-sm text-slate-500">
          Aucun livre lu pour l'instant.
        </div>
      ) : (
        <div className="px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <div key={book.id} className="flex flex-col gap-1.5">
                <BookCover book={book} />
                <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
                <p className="text-[11px] text-slate-400 leading-tight line-clamp-1">
                  {book.authors.join(', ')}
                </p>
                {book.rating !== null && <StarRating rating={book.rating} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center gap-2 px-6">
        <p className="text-xs text-slate-500">Suis tes lectures avec JAILU</p>
        <a
          href="https://jailu-prod.web.app"
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
        >
          Télécharger JAILU
        </a>
      </div>
    </div>
  )
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7">
        <rect width="32" height="32" rx="8" fill="#4F46E5" />
        <path
          d="M9 8h9a5 5 0 010 10H9V8zm0 10h10a5 5 0 010 10H9V18z"
          fill="white"
          opacity="0.9"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight text-white">JAILU</span>
    </div>
  )
}
