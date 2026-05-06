import { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()
    if (trimmed.length >= 2) {
      debounceRef.current = setTimeout(() => onSearch(trimmed), 500)
    } else if (trimmed.length === 0) {
      onSearch('')
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, onSearch])

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Rechercher un livre, un auteur..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl bg-slate-800 px-4 py-3 pr-10 text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
        </div>
      )}
    </div>
  )
}
