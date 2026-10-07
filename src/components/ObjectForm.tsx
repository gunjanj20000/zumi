import React, { useState, useEffect, useRef } from 'react'
import type { ObjectCard } from '../types/types'
import { processAndCompressImage, createImageUrl, revokeImageUrl } from '../services/imageProcessing'
import { Camera, Image as ImageIcon, Plus, X, Upload, Check } from 'lucide-react'

interface ObjectFormProps {
  initialData?: ObjectCard | null
  onSave: (data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>) => Promise<void>
  onCancel: () => void
}

export const ObjectForm: React.FC<ObjectFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || '')
  const [secondLanguageName, setSecondLanguageName] = useState(initialData?.secondLanguageName || '')
  const [alternateNames, setAlternateNames] = useState<string[]>(initialData?.alternateNames || [])
  const [altInput, setAltInput] = useState('')
  const [imageBlob, setImageBlob] = useState<Blob | null>(initialData?.imageBlob || null)
  const [mimeType, setMimeType] = useState(initialData?.mimeType || 'image/webp')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (imageBlob) {
      const url = createImageUrl(imageBlob)
      setPreviewUrl(url)
      return () => {
        revokeImageUrl(url)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [imageBlob])

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsProcessing(true)
      setError(null)
      const processed = await processAndCompressImage(file)
      setImageBlob(processed.blob)
      setMimeType(processed.mimeType)
    } catch (err: any) {
      setError(err?.message || 'Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddAlternate = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = altInput.trim()
    if (trimmed && !alternateNames.includes(trimmed)) {
      setAlternateNames([...alternateNames, trimmed])
      setAltInput('')
    }
  }

  const handleRemoveAlternate = (itemToRemove: string) => {
    setAlternateNames(alternateNames.filter((item) => item !== itemToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter an object name.')
      return
    }

    if (!imageBlob) {
      setError('Please choose or capture an image.')
      return
    }

    try {
      setIsProcessing(true)
      setError(null)

      const id = initialData?.id || `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

      await onSave({
        id,
        name: name.trim(),
        alternateNames: alternateNames.length > 0 ? alternateNames : undefined,
        secondLanguageName: secondLanguageName.trim() || undefined,
        imageBlob,
        mimeType,
        createdAt: initialData?.createdAt || Date.now(),
        updatedAt: Date.now(),
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to save object')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-100 max-w-xl w-full mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-rose-100">
        <h3 className="text-xl sm:text-2xl font-black text-slate-800">
          {initialData ? 'Edit Object' : 'Add New Object'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Object Name */}
        <div>
          <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
            Object Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apple, Bhujia, Ball"
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none text-base font-bold text-slate-800 transition-all"
          />
        </div>

        {/* Second Language Name */}
        <div>
          <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
            Second-Language Name <span className="text-xs font-normal text-slate-400">(Optional, e.g. Hindi)</span>
          </label>
          <input
            type="text"
            value={secondLanguageName}
            onChange={(e) => setSecondLanguageName(e.target.value)}
            placeholder="e.g. सेब, भुजिया, गेंद"
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none text-base font-bold text-slate-800 transition-all"
          />
        </div>

        {/* Alternate Pronunciations / Aliases */}
        <div>
          <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
            Alternate Names &amp; Child Pronunciations <span className="text-xs font-normal text-slate-400">(Optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddAlternate()
                }
              }}
              placeholder="e.g. bhujiya, sev, red apple"
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm font-bold text-slate-800"
            />
            <button
              type="button"
              onClick={() => handleAddAlternate()}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Alternate Names Tag Chips */}
          {alternateNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {alternateNames.map((alt) => (
                <span
                  key={alt}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold"
                >
                  {alt}
                  <button
                    type="button"
                    onClick={() => handleRemoveAlternate(alt)}
                    className="hover:text-rose-950 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Image Selection & Preview */}
        <div>
          <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
            Object Image <span className="text-rose-500">*</span>
          </label>

          {/* Hidden inputs for File and Camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />

          {/* Image preview box */}
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-200 bg-amber-50/50 p-3 flex flex-col items-center">
              <div className="w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              </div>

              <div className="mt-3 flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Retake
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-extrabold text-rose-700">Take Photo</span>
                <span className="text-xs text-rose-400 font-medium">Use Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-amber-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-sm font-extrabold text-amber-800">Upload Image</span>
                <span className="text-xs text-amber-500 font-medium">Choose File</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-base transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-base shadow-lg shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? 'Processing…' : (
              <>
                <Check className="w-5 h-5" /> Save Object
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
