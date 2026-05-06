import { useState } from 'react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = (err: unknown) => {
    const authErr = err as AuthError
    setError(authErr.message ?? 'Une erreur est survenue')
    setIsLoading(false)
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      try {
        await createUserWithEmailAndPassword(auth, email, password)
      } catch (err) {
        handleError(err)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-white">
          JAILU
        </h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Ta bibliothèque personnelle
        </p>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
          />
          {error !== null && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Connexion...' : 'Connexion / Inscription'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <hr className="flex-1 border-slate-600" />
          <span className="text-xs text-slate-500">ou</span>
          <hr className="flex-1 border-slate-600" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-700 py-3 text-white transition hover:bg-slate-600 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </button>
      </div>
    </div>
  )
}
