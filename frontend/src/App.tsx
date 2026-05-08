import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './lib/firebase'
import LoginPage from './pages/LoginPage'
import LibraryPage from './pages/LibraryPage'
import PublicProfilePage from './components/PublicProfilePage'

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return isOnline
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }

function AuthenticatedApp() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })
  const isOnline = useOnlineStatus()

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

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-sm font-medium text-amber-950 backdrop-blur-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Mode hors ligne — tes données sont disponibles en cache
        </div>
      )}
      {authState.status === 'authenticated' && <LibraryPage user={authState.user} />}
      {authState.status === 'unauthenticated' && <LoginPage />}
    </>
  )
}

export default function App() {
  // Public profile route — no auth needed, no Firebase initialised
  const publicMatch = window.location.pathname.match(/^\/u\/([^/]+)\/?$/)
  if (publicMatch) {
    return <PublicProfilePage username={publicMatch[1]} />
  }

  return <AuthenticatedApp />
}
