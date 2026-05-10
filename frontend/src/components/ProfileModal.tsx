import { useEffect, useRef, useState, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '../lib/firebase'
import { updateUserPhotoURL, setProfilePublic, updateBio, getMyFollowing, getFollowers } from '../lib/firestore'
import type { UserProfile } from '../types/book'

interface Props {
  user: User
  profile: UserProfile
  onClose: () => void
  onPhotoUpdated: (url: string) => void
  onProfileUpdated?: (profile: UserProfile) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'password': 'Email / Mot de passe',
}

export default function ProfileModal({ user, profile, onClose, onPhotoUpdated, onProfileUpdated }: Props) {
  const providers = user.providerData.map((p) => PROVIDER_LABELS[p.providerId] ?? p.providerId)
  const initial = profile.username[0].toUpperCase()
  const googlePhoto = user.providerData.find((p) => p.photoURL)?.photoURL ?? null
  const [photoURL, setPhotoURL] = useState<string | null>(profile.photoURL ?? googlePhoto)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState(profile.isPublic ?? true)
  const publicUrl = `https://jailu-prod.web.app/u/${profile.username}`

  // Bio state
  const [bio, setBio] = useState(profile.bio ?? '')
  const [editingBio, setEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)

  // Follower/following counts (load on mount)
  const [followersCount, setFollowersCount] = useState(profile.followersCount ?? 0)
  const [followingCount, setFollowingCount] = useState(profile.followingCount ?? 0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load accurate counts
  useEffect(() => {
    void Promise.all([
      getFollowers(user.uid).catch(() => []),
      getMyFollowing().catch(() => []),
    ]).then(([followers, following]) => {
      setFollowersCount(followers.length)
      setFollowingCount(following.length)
    })
  }, [user.uid])

  const handleTogglePublic = async () => {
    const next = !isPublic
    setIsPublic(next)
    try {
      await setProfilePublic(next)
    } catch {
      setIsPublic(!next) // rollback
    }
  }

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bibliothèque de @${profile.username}`, url: publicUrl })
      } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* clipboard permission denied */ }
    }
  }, [publicUrl, profile.username])

  const handleSaveBio = async () => {
    setSavingBio(true)
    try {
      await updateBio(bio)
      setEditingBio(false)
      onProfileUpdated?.({ ...profile, bio: bio.trim() || null })
    } catch { /* ignore */ }
    finally { setSavingBio(false) }
  }

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
        className="w-full max-w-sm rounded-t-3xl bg-slate-800 sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Avatar + username + stats */}
          <div className="flex flex-col items-center px-6 pt-4 pb-5">
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
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {uploadError && <p className="mb-2 text-xs text-red-400">{uploadError}</p>}

            <h2 className="text-xl font-bold text-white">@{profile.username}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{user.email}</p>

            {/* Instagram-style counts */}
            <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center">
              <div className="rounded-2xl bg-slate-700/50 py-3">
                <p className="text-2xl font-bold text-white">{followersCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Abonnés</p>
              </div>
              <div className="rounded-2xl bg-slate-700/50 py-3">
                <p className="text-2xl font-bold text-white">{followingCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Abonnements</p>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-4 w-full">
              {editingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={150}
                    placeholder="Décris-toi en quelques mots…"
                    className="w-full resize-none rounded-xl bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBio(false)}
                      className="flex-1 rounded-xl bg-slate-700 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => void handleSaveBio()}
                      disabled={savingBio}
                      className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {savingBio ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingBio(true)}
                  className="w-full rounded-xl bg-slate-700/40 px-3 py-2.5 text-left text-sm transition hover:bg-slate-700/70"
                >
                  {bio ? (
                    <span className="text-slate-300">{bio}</span>
                  ) : (
                    <span className="text-slate-500">Ajouter une bio…</span>
                  )}
                  <span className="float-right text-[10px] text-indigo-400 font-medium">Modifier</span>
                </button>
              )}
            </div>
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

          {/* Public profile */}
          <div className="border-t border-slate-700/60 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Mon profil public</p>
              <button
                onClick={() => void handleTogglePublic()}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isPublic ? 'bg-indigo-600' : 'bg-slate-600'}`}
                role="switch"
                aria-checked={isPublic}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            {isPublic ? (
              <div className="flex items-center gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate rounded-lg bg-slate-700/50 px-3 py-2 text-xs text-slate-300 hover:text-white transition"
                >
                  jailu-prod.web.app/u/{profile.username}
                </a>
                <button
                  onClick={() => void handleShare()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/40 hover:text-indigo-200"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copié
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Partager
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Ton profil est privé — personne ne peut voir ta bibliothèque.</p>
            )}
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
    </div>
  )
}
