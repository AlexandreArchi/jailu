import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface LibraryPageProps {
  user: User
}

export default function LibraryPage({ user }: LibraryPageProps) {
  const displayName = user.displayName ?? user.email ?? 'Lecteur'

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-indigo-400">JAILU</span>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600 hover:text-white"
        >
          Déconnexion
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-2xl font-semibold sm:text-3xl">
          Bonjour {displayName}, ta bibliothèque est vide.
        </p>
        <p className="mt-4 text-slate-400">Les livres ajoutés apparaîtront ici.</p>
      </main>
    </div>
  )
}
