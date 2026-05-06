import { useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '../lib/firebase'
import { updateUserPhotoURL } from '../lib/firestore'
import type { UserProfile } from '../types/book'

interface Props {
  user: User
  profile: UserProfile
  onClose: () => void
  onPhotoUpdated: (url: string) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'password': 'Email / Mot de passe',
}

export default function ProfileModal({ user, profile, onClose, onPhotoUpdated }: Props) {
  const providers = user.providerData.map((p) => PROVIDER_LABELS[p.providerId] ?? p.providerId)
  const initial = profile.username[0].toUpperCase()
  const googlePhoto = user.providerData.find((p) => p.photoURL)?.photoURL ?? null
  const [photoURL, setPhotoURL] = useState<string | null>(profile.photoURL ?? googlePhoto)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Fichier invalide — choisis une image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image trop lourde (max 2 Mo).')
      return
    }
    setUploadError(null)
    setIsUploading(true)
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}`)
      await uploadBytes(avatarRef, file, { contentType: file.type })
      const url = await getDownloadURL(avatarRef)
      await updateUserPhotoURL(url)
      setPhotoURL(url)
      onPhotoUpdated(url)
    } catch {
      setUploadError('Erreur lors de l\'upload. Réessaie.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-slate-800 sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        {/* Avatar + username */}
        <div className="flex flex-col items-center px-6 pt-4 pb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="relative mb-3 h-20 w-20 overflow-hidden rounded-full ring-2 ring-indigo-500/40 transition hover:ring-indigo-500/80"
            aria-label="Changer la photo"
          >
            {photoURL ? (
              <img src={photoURL} alt={profile.username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-600/20">
                <span className="text-3xl font-bold text-indigo-400">{initial}</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              {isUploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadError && <p className="mb-2 text-xs text-red-400">{uploadError}</p>}
          {!uploadError && <p className="mb-2 text-xs text-slate-500">Appuie sur l'avatar pour changer la photo</p>}
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
