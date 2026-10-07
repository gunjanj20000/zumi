import React, { useState, useEffect } from 'react'
import { createImageUrl, revokeImageUrl } from '../services/imageProcessing'
import { Image as ImageIcon } from 'lucide-react'

interface ObjectThumbnailProps {
  blob: Blob
  alt: string
  className?: string
  fit?: 'contain' | 'cover'
}

export const ObjectThumbnail: React.FC<ObjectThumbnailProps> = ({
  blob,
  alt,
  className = 'w-full h-full',
  fit = 'contain',
}) => {
  const [url, setUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const objUrl = createImageUrl(blob)
    setUrl(objUrl)
    setHasError(false)

    return () => {
      revokeImageUrl(objUrl)
    }
  }, [blob])

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
      loading="lazy"
      onError={() => setHasError(true)}
      className={`${className} ${fit === 'cover' ? 'object-cover' : 'object-contain'} transition-opacity duration-200`}
    />
  )
}
