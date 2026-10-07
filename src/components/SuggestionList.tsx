import React from 'react'
import type { ObjectCard } from '../types/types'
import { ObjectThumbnail } from './ObjectThumbnail'

interface SuggestionListProps {
  suggestions: ObjectCard[]
  query: string
  onSelect: (object: ObjectCard) => void
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  query,
  onSelect,
}) => {
  if (suggestions.length === 0) return null

  // Function to highlight matched substring
  const renderHighlighted = (text: string, queryStr: string) => {
    if (!queryStr.trim()) return text

    const lowerText = text.toLowerCase()
    const lowerQuery = queryStr.toLowerCase().trim()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) return text

    const before = text.slice(0, index)
    const match = text.slice(index, index + lowerQuery.length)
    const after = text.slice(index + lowerQuery.length)

    return (
      <span>
        {before}
        <span className="bg-amber-200 text-slate-900 font-extrabold rounded px-0.5">
          {match}
        </span>
        {after}
      </span>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-30 max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-rose-100 overflow-hidden divide-y divide-rose-50 animate-fadeIn">
      <div className="px-3.5 py-1.5 bg-rose-50/50 text-[11px] font-bold text-rose-500 uppercase tracking-wider flex justify-between items-center">
        <span>Suggested Objects</span>
        <span>Tap to show &amp; speak</span>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full text-left px-4 py-3 flex items-center gap-3.5 hover:bg-rose-50/80 active:bg-rose-100 transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
              <ObjectThumbnail blob={item.imageBlob} alt={item.name} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-base sm:text-lg text-slate-800 group-hover:text-rose-600 transition-colors truncate">
                {renderHighlighted(item.name, query)}
              </div>
              {item.secondLanguageName && (
                <div className="text-xs font-semibold text-rose-400">
                  {item.secondLanguageName}
                </div>
              )}
            </div>

            <span className="text-xs font-bold text-rose-500 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 opacity-0 group-hover:opacity-100 transition-opacity">
              Show
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
