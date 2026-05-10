import { useEffect, useState } from 'react'
import { checkUsernameAvailable, createUserProfile } from '../lib/firestore'
import { auth } from '../lib/firebase'
import type { UserProfile } from '../types/book'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

interface Props {
  onComplete: (profile: UserProfile) => void
}

export default function UsernameSetupModal({ onComplete }: Props) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!value) { setStatus('idle'); return }
    if (!USERNAME_RE.test(value)) { setStatus('invalid'); return }

    setStatus('checking')
    const t = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(value)
        setStatus(available ? 'available' : 'taken')
      } catch {
        setStatus('idle') // allow retry on network error
      }
    }, 600)
    return () => clearTimeout(t)
  }, [value])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'available') return
    setIsSaving(true)
    try {
      await createUserProfile(value)
      const uid = auth.currentUser?.uid ?? ''
      onComplete({ uid, username: value, photoURL: null, createdAt: new Date() })
    } catch {
      setIsSaving(false)
    }
  }

  const hint =
    status === 'invalid' ? '3–20 caractères, lettres minuscules, chiffres ou _' :
    status === 'checking' ? 'Vérification...' :
    status === 'taken' ? 'Ce pseudo est déjà pris' :
    status === 'available' ? 'Pseudo disponible ✓' :
    'Entre ton pseudo pour rejoindre JAILU'

  const hintColor =
    status === 'available' ? 'text-emerald-400' :
    status === 'taken' || status === 'invalid' ? 'text-red-400' :
    'text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Choisis ton pseudo</h1>
          <p className="mt-2 text-sm text-slate-400">Il sera visible par tes amis sur JAILU</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center rounded-xl bg-slate-800 px-4 py-3 ring-1 ring-slate-700 focus-within:ring-indigo-500 transition">
              <span className="mr-1 text-slate-500 font-medium">@</span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ton_pseudo"
                maxLength={20}
                autoFocus
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none font-medium"
              />
            </div>
            <p className={`mt-2 text-xs ${hintColor}`}>{hint}</p>
          </div>

          <button
            type="submit"
            disabled={status !== 'available' || isSaving}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            {isSaving ? 'Création...' : 'Continuer'}
          </button>
        </form>
      </div>
    </div>
  )
}
