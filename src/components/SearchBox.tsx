import React, { useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = 'Type an object name…',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit()
    } else if (e.key === 'Escape') {
      onClear()
    }
  }

  return (
    <div className="relative w-full max-w-xl mx-auto group">
      <div className="relative flex items-center shadow-md hover:shadow-lg focus-within:shadow-xl focus-within:ring-4 focus-within:ring-rose-200 transition-all rounded-3xl bg-white border-2 border-rose-100 overflow-hidden">
        <div className="pl-4 sm:pl-5 pr-2 flex items-center pointer-events-none text-rose-400 group-focus-within:text-rose-500 transition-colors">
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search for an object"
          className="w-full py-3.5 sm:py-4 px-2 text-base sm:text-lg lg:text-xl font-bold text-slate-800 placeholder-slate-400 bg-transparent outline-none tracking-wide"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onClear()
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="p-2 sm:p-2.5 mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
