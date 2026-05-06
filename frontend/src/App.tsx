import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './lib/firebase'
import LoginPage from './pages/LoginPage'
import LibraryPage from './pages/LibraryPage'

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(
        user ? { status: 'authenticated', user } : { status: 'unauthenticated' },
      )
    })
    return unsubscribe
  }, [])

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
      </div>
    )
  }

  if (authState.status === 'authenticated') {
    return <LibraryPage user={authState.user} />
  }

  return <LoginPage />
}
