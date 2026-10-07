import React, { useState, useMemo } from 'react'
import type { ObjectCard } from '../types/types'
import { ObjectThumbnail } from './ObjectThumbnail'
import { Plus, Search, Trash2, Edit3, Sparkles, AlertTriangle } from 'lucide-react'

interface ObjectLibraryProps {
  objects: ObjectCard[]
  onAddNew: () => void
  onEdit: (object: ObjectCard) => void
  onDelete: (id: string) => Promise<void>
  onLoadStarterPack: () => Promise<void>
}

export const ObjectLibrary: React.FC<ObjectLibraryProps> = ({
  objects,
  onAddNew,
  onEdit,
  onDelete,
  onLoadStarterPack,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<ObjectCard | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  // Filter objects by search
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects
    const q = searchQuery.toLowerCase().trim()
    return objects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(q) ||
        obj.alternateNames?.some((alt) => alt.toLowerCase().includes(q)) ||
        obj.secondLanguageName?.toLowerCase().includes(q)
    )
  }, [objects, searchQuery])

  const confirmDelete = async () => {
    if (!deleteCandidate) return
    try {
      setIsDeleting(true)
      await onDelete(deleteCandidate.id)
      setDeleteCandidate(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSeed = async () => {
    try {
      setIsSeeding(true)
      await onLoadStarterPack()
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Search & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search object library…"
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm font-bold text-slate-800 bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{isSeeding ? 'Loading…' : 'Load Starter Pack'}</span>
          </button>

          <button
            type="button"
            onClick={onAddNew}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Object</span>
          </button>
        </div>
      </div>

      {/* Grid of Objects */}
      {objects.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-rose-200 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 mb-1">No objects added yet</h4>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Create your child's first custom object card, or load the high-contrast starter pack!
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onAddNew}
              className="px-5 py-2.5 rounded-2xl bg-rose-500 text-white font-extrabold text-sm hover:bg-rose-600 cursor-pointer shadow-md"
            >
              Add First Object
            </button>
            <button
              onClick={handleSeed}
              className="px-5 py-2.5 rounded-2xl bg-amber-100 text-amber-900 font-extrabold text-sm hover:bg-amber-200 cursor-pointer"
            >
              Load Starter Pack
            </button>
          </div>
        </div>
      ) : filteredObjects.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-3xl border border-slate-100">
          No objects match "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {filteredObjects.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-3xl p-3 sm:p-4 border-2 border-rose-100 hover:border-rose-300 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail */}
                <div className="w-full aspect-square bg-amber-50/50 rounded-2xl overflow-hidden border border-amber-100/60 p-2 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ObjectThumbnail blob={item.imageBlob} alt={item.name} />
                </div>

                {/* Name */}
                <h5 className="font-black text-slate-800 text-base sm:text-lg truncate tracking-wide text-center uppercase">
                  {item.name}
                </h5>

                {/* Second language */}
                {item.secondLanguageName && (
                  <div className="text-xs font-bold text-rose-500 text-center truncate">
                    {item.secondLanguageName}
                  </div>
                )}

                {/* Alternates count */}
                {item.alternateNames && item.alternateNames.length > 0 && (
                  <div className="text-[11px] font-semibold text-slate-400 text-center mt-1">
                    {item.alternateNames.length} alternate name{item.alternateNames.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  title="Edit object"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(item)}
                  title="Delete object"
                  className="p-1.5 rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-rose-100 animate-fadeIn text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-1">
              Delete "{deleteCandidate.name}"?
            </h4>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently remove this object and its image from your library.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
