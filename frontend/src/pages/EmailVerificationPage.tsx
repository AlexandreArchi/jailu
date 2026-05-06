import { useEffect, useState } from 'react'
import { sendEmailVerification, signOut, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface Props {
  user: User
}

export default function EmailVerificationPage({ user }: Props) {
  const [checking, setChecking] = useState(false)
  const [notYet, setNotYet] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendDone, setResendDone] = useState(false)

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleCheck = async () => {
    setChecking(true)
    setNotYet(false)
    try {
      await user.reload()
      if (!auth.currentUser?.emailVerified) {
        setNotYet(true)
      }
      // If verified, onAuthStateChanged in App.tsx will re-fire and
      // the emailVerified check will pass, showing the app.
    } finally {
      setChecking(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    await sendEmailVerification(user)
    setResendDone(true)
    setResendCooldown(60)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-8 shadow-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="mb-2 text-xl font-bold text-white">Vérifie ton email</h1>
        <p className="mb-1 text-sm text-slate-400">
          On a envoyé un lien de confirmation à
        </p>
        <p className="mb-6 text-sm font-semibold text-white">{user.email}</p>

        <p className="mb-6 text-xs text-slate-500">
          Clique sur le lien dans l'email, puis reviens ici.
          Vérifie aussi tes spams.
        </p>

        {notYet && (
          <p className="mb-4 rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm text-amber-400 ring-1 ring-amber-500/30">
            Adresse pas encore vérifiée. Clique sur le lien dans l'email.
          </p>
        )}

        <button
          onClick={() => void handleCheck()}
          disabled={checking}
          className="mb-3 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {checking ? 'Vérification...' : "J'ai cliqué sur le lien →"}
        </button>

        <button
          onClick={() => void handleResend()}
          disabled={resendCooldown > 0}
          className="mb-6 w-full rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
        >
          {resendCooldown > 0
            ? `Renvoyer l'email (${resendCooldown}s)`
            : resendDone
            ? '✓ Email renvoyé'
            : "Renvoyer l'email"}
        </button>

        <button
          onClick={() => void signOut(auth)}
          className="text-xs text-slate-600 hover:text-slate-400 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
