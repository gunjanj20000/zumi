import React, { useState, useEffect } from 'react'
import { createImageUrl, revokeImageUrl } from '../services/imageProcessing'
import { Image as ImageIcon } from 'lucide-react'

interface ObjectThumbnailProps {
  blob?: Blob | string | null
  imageDataUrl?: string | null
  alt: string
  className?: string
  fit?: 'contain' | 'cover'
}

export const ObjectThumbnail: React.FC<ObjectThumbnailProps> = ({
  blob,
  imageDataUrl,
  alt,
  className = 'w-full h-full',
  fit = 'contain',
}) => {
  const [url, setUrl] = useState<string | null>(() => {
    if (typeof imageDataUrl === 'string' && imageDataUrl.length > 20) {
      return imageDataUrl
    }
    if (typeof blob === 'string' && blob.length > 20) {
      return blob
    }
    return null
  })
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // 1. Permanent direct Data URL string (resilient, no revocation race condition)
    const directUrl =
      typeof imageDataUrl === 'string' && imageDataUrl.length > 20
        ? imageDataUrl
        : typeof blob === 'string' && blob.length > 20
          ? blob
          : null

    if (directUrl) {
      setUrl(directUrl)
      setHasError(false)
      return
    }

    // 2. Blob object URL
    if (blob && (blob instanceof Blob || typeof (blob as any).slice === 'function') && (blob as any).size > 0) {
      try {
        const objUrl = createImageUrl(blob as Blob)
        setUrl(objUrl)
        setHasError(false)

        return () => {
          revokeImageUrl(objUrl)
        }
      } catch (err) {
        console.warn('Could not create object URL for thumbnail:', err)
        setHasError(true)
      }
      return
    }

    setUrl(null)
    setHasError(false)
  }, [blob, imageDataUrl])

  if (!url || hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <ImageIcon className="w-5 h-5 opacity-50" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => {
        // Fallback to imageDataUrl if blob URL failed
        if (url !== imageDataUrl && typeof imageDataUrl === 'string' && imageDataUrl.length > 20) {
          setUrl(imageDataUrl)
        } else {
          setHasError(true)
        }
      }}
      className={`${className} ${fit === 'cover' ? 'object-cover' : 'object-contain'} transition-opacity duration-200`}
    />
  )
}
