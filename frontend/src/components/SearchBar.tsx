import { useState, useEffect, useRef } from 'react'

type SearchMode = 'general' | 'title' | 'author'

const MODES: { key: SearchMode; label: string; prefix: string; placeholder: string }[] = [
  { key: 'general', label: 'Tout', prefix: '', placeholder: 'Titre, auteur, ISBN…' },
  { key: 'title', label: 'Titre', prefix: 'intitle:', placeholder: 'Titre du livre…' },
  { key: 'author', label: 'Auteur', prefix: 'inauthor:', placeholder: 'Nom de l\'auteur…' },
]

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<SearchMode>('general')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentMode = MODES.find((m) => m.key === mode)!

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()
    if (trimmed.length >= 3) {
      const q = currentMode.prefix ? `${currentMode.prefix}${trimmed}` : trimmed
      debounceRef.current = setTimeout(() => onSearch(q), 500)
    } else if (trimmed.length === 0) {
      onSearch('')
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, mode, onSearch, currentMode.prefix])

  const handleModeChange = (m: SearchMode) => {
    setMode(m)
    // Re-trigger search immediately with new prefix
    const trimmed = value.trim()
    if (trimmed.length >= 3) {
      const newMode = MODES.find((x) => x.key === m)!
      const q = newMode.prefix ? `${newMode.prefix}${trimmed}` : trimmed
      onSearch(q)
    }
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-xl bg-slate-800/80 p-1 w-fit">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => handleModeChange(m.key)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              mode === m.key
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="search"
          placeholder={currentMode.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 pr-10 text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
        />
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
          </div>
        ) : value && (
          <button
            onClick={() => { setValue(''); onSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
