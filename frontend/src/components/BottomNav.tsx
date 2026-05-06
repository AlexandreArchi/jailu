type Tab = 'home' | 'to_read' | 'read' | 'search' | 'friends'

interface BottomNavProps {
  active: Tab
  onChange: (tab: Tab) => void
  toReadCount: number
  readCount: number
  pendingFriendsCount: number
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
    </svg>
  )
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
    </svg>
  )
}

function FriendsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

export default function BottomNav({ active, onChange, toReadCount, readCount, pendingFriendsCount }: BottomNavProps) {
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'home', label: 'Résumé' },
    { key: 'to_read', label: 'À lire', count: toReadCount },
    { key: 'read', label: 'Lus', count: readCount },
    { key: 'search', label: 'Chercher' },
    { key: 'friends', label: 'Amis', count: pendingFriendsCount },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ key, label, count }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-3 transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-indigo-500" />
              )}
              <div className="relative">
                {key === 'home' && <HomeIcon active={isActive} />}
                {key === 'to_read' && <BookmarkIcon active={isActive} />}
                {key === 'read' && <CheckIcon active={isActive} />}
                {key === 'search' && <SearchIcon active={isActive} />}
                {key === 'friends' && <FriendsIcon active={isActive} />}
                {count !== undefined && count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
