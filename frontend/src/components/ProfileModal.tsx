import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { UserProfile } from '../types/book'

interface Props {
  user: User
  profile: UserProfile
  onClose: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'password': 'Email / Mot de passe',
}

export default function ProfileModal({ user, profile, onClose }: Props) {
  const providers = user.providerData.map((p) => PROVIDER_LABELS[p.providerId] ?? p.providerId)
  const initial = profile.username[0].toUpperCase()
  const photoURL = user.providerData.find((p) => p.photoURL)?.photoURL ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-slate-800 sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        {/* Avatar + username */}
        <div className="flex flex-col items-center px-6 pt-4 pb-6">
          <div className="mb-3 h-20 w-20 overflow-hidden rounded-full ring-2 ring-indigo-500/40">
            {photoURL ? (
              <img src={photoURL} alt={profile.username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-600/20">
                <span className="text-3xl font-bold text-indigo-400">{initial}</span>
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">@{profile.username}</h2>
          <p className="mt-0.5 text-sm text-slate-400">{user.email}</p>
        </div>

        {/* Info */}
        <div className="border-t border-slate-700/60 px-6 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Connexion via</p>
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <span key={p} className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">{p}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Membre depuis</p>
            <p className="text-sm text-slate-300">
              {profile.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-slate-700/60 px-6 py-4">
          <button
            onClick={() => void signOut(auth)}
            className="w-full rounded-xl py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
