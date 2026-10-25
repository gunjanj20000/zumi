/**
 * Universal Word Pack Interchange Format
 * Enables seamless sharing of words, objects, images, and audio across
 * CogniCard, WordLearn, TraceTheWord, and Zumi.
 */

export interface UniversalCategory {
  id: string | number
  name: string
  icon?: string
  color?: string
  enabled?: boolean
}

export interface UniversalWordItem {
  id: string
  word: string // Lowercase: "apple"
  text: string // Uppercase: "APPLE"
  englishWord: string // Title-cased: "Apple"
  hindiWord?: string // Optional Hindi / second-language translation (e.g. "सेब")
  category: string // Category name: "Food"
  categoryId?: string | number
  alternateNames?: string[]
  imageDataUrl?: string // base64 or SVG data URL
  imageBase64?: string // Alias for imageDataUrl
  audioDataUrl?: string // base64 audio data URL
  englishAudioBase64?: string // Alias
  hindiAudioBase64?: string // Alias
  builtInImage?: string // Built-in vector illustration key if any
  imageId?: string
  audioId?: string
  createdAt?: number
  length?: number
  enabled?: boolean
  favorite?: boolean
  orderIndex?: number
}

export interface UniversalMediaItem {
  id: string
  type: 'image' | 'audio'
  data: string // Data URL
  mimeType: string
}

export interface UniversalWordPack {
  version: number
  format: 'universal-word-pack'
  appName: string
  exportedAt: string
  totalWords: number
  totalCategories: number
  categories: UniversalCategory[]
  words: UniversalWordItem[]
  flashcards?: any[]
  cards?: any[]
  objects?: any[]
  media?: UniversalMediaItem[]
  settings?: any
}

export interface ParsedWordPackResult {
  words: UniversalWordItem[]
  categories: UniversalCategory[]
  hasAudioCount: number
  hasImageCount: number
  appName?: string
  exportedAt?: string
  rawSettings?: any
}

/**
 * Normalizes any audio input (data URL, WebM, generic octet-stream, or raw base64)
 * into a browser-playable audio data URL (e.g. data:audio/mp3;base64,... or data:audio/webm;base64,...).
 */
export function normalizeAudioDataUrl(str: unknown): string | undefined {
  if (typeof str !== 'string') return undefined
  const trimmed = str.trim()
  if (!trimmed) return undefined

  // 1. Standard audio data URL
  if (trimmed.startsWith('data:audio/')) {
    return trimmed
  }

  // 2. Data URL with different MIME (e.g. video/webm or application/octet-stream or generic data:;base64,)
  if (trimmed.startsWith('data:')) {
    const semiIdx = trimmed.indexOf(';')
    if (semiIdx !== -1 && trimmed.includes(';base64,')) {
      const mime = trimmed.substring(5, semiIdx).toLowerCase()
      const base64Part = trimmed.substring(trimmed.indexOf(';base64,') + 8).replace(/\s+/g, '')
      if (mime.includes('webm')) {
        return `data:audio/webm;base64,${base64Part}`
      }
      if (mime.includes('mp4') || mime.includes('m4a')) {
        return `data:audio/mp4;base64,${base64Part}`
      }
      if (mime.includes('wav')) {
        return `data:audio/wav;base64,${base64Part}`
      }
      if (mime.includes('ogg')) {
        return `data:audio/ogg;base64,${base64Part}`
      }
      return `data:audio/mp3;base64,${base64Part}`
    }
  }

  // 3. Raw base64 string without data: prefix
  if (/^[A-Za-z0-9+/=_\-\s]+$/.test(trimmed) && trimmed.length > 20) {
    const cleanBase64 = trimmed.replace(/\s+/g, '')
    return `data:audio/mp3;base64,${cleanBase64}`
  }

  return undefined
}

/**
 * Normalizes any image input (data URL, SVG string, generic octet-stream, or raw base64)
 * into a valid image data URL.
 */
export function normalizeImageDataUrl(str: unknown): string | undefined {
  if (typeof str !== 'string') return undefined
  const trimmed = str.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }

  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`
  }

  if (trimmed.startsWith('data:')) {
    if (trimmed.includes(';base64,')) {
      const base64Part = trimmed.substring(trimmed.indexOf(';base64,') + 8).replace(/\s+/g, '')
      return `data:image/png;base64,${base64Part}`
    }
  }

  if (/^[A-Za-z0-9+/=_\-\s]+$/.test(trimmed) && trimmed.length > 50) {
    const cleanBase64 = trimmed.replace(/\s+/g, '')
    return `data:image/png;base64,${cleanBase64}`
  }

  return undefined
}

/**
 * Converts a data URL or raw base64 string directly into a Blob.
 */
export function dataUrlToBlob(dataUrlOrBase64: string, defaultMime: string = 'application/octet-stream'): Blob {
  const trimmed = dataUrlOrBase64.trim()
  const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/s)
  if (matches) {
    const mime = matches[1]
    const base64Data = matches[2].replace(/\s+/g, '')
    const byteString = atob(base64Data)
    const arrayBuffer = new ArrayBuffer(byteString.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i)
    }
    return new Blob([uint8Array], { type: mime })
  }

  // SVG data URL
  if (trimmed.startsWith('data:image/svg+xml')) {
    const commaIdx = trimmed.indexOf(',')
    const svgText = decodeURIComponent(trimmed.substring(commaIdx + 1))
    return new Blob([svgText], { type: 'image/svg+xml' })
  }

  // Raw base64 string fallback
  try {
    const base64Data = trimmed.replace(/\s+/g, '')
    const byteString = atob(base64Data)
    const arrayBuffer = new ArrayBuffer(byteString.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i)
    }
    return new Blob([uint8Array], { type: defaultMime })
  } catch {
    return new Blob([trimmed], { type: defaultMime })
  }
}

/**
 * Converts a Blob to a base64 Data URL.
 */
export async function blobToDataUrl(blob: Blob, fallbackMime?: string): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        let res = reader.result as string
        if (
          fallbackMime &&
          (res.startsWith('data:;base64,') ||
            res.startsWith('data:application/octet-stream;base64,') ||
            res.startsWith('data:;'))
        ) {
          res = res.replace(/^data:[^;]*;base64,/, `data:${fallbackMime};base64,`)
        }
        resolve(res)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  // Node.js test environment fallback
  const NodeBuffer = (globalThis as any).Buffer
  if (NodeBuffer) {
    const arrayBuffer = await blob.arrayBuffer()
    const mime = blob.type || fallbackMime || 'application/octet-stream'
    return `data:${mime};base64,${NodeBuffer.from(arrayBuffer).toString('base64')}`
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:${blob.type || fallbackMime || 'application/octet-stream'};base64,${btoa(binary)}`
}

/**
 * Universal parser that understands files from:
 * 1. CogniCard (categories + flashcards with englishWord, hindiWord, englishAudioBase64/imageBase64)
 * 2. WordLearn (words with audioDataUrl/imageDataUrl + categories)
 * 3. TraceTheWord (words + media store + categories)
 * 4. Universal Word Pack (v2 format with words, media, categories)
 * 5. Zumi native (objects with imageBase64/audioBase64)
 * 6. Simple word arrays [ { word: "..." }, ... ]
 */
export function parseAnyWordPack(input: string | any): ParsedWordPackResult {
  let data: any
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      throw new Error('File is not valid JSON. Please upload a valid JSON file.')
    }
  } else {
    data = input
  }

  if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
    throw new Error('Invalid file structure. Expected JSON object or array.')
  }

  // 1. Build Media Map if media array exists (TraceTheWord & Universal format)
  const mediaMap = new Map<string, { data: string; mimeType: string }>()
  if (Array.isArray(data.media)) {
    for (const m of data.media) {
      if (m && m.id && m.data) {
        const idStr = String(m.id).trim()
        const mime = m.mimeType || (m.type === 'audio' || idStr.startsWith('aud') ? 'audio/mp3' : 'image/png')
        const mediaVal = { data: String(m.data), mimeType: mime }
        mediaMap.set(idStr, mediaVal)
        mediaMap.set(idStr.toLowerCase(), mediaVal)
      }
    }
  }

  // 2. Extract Categories
  const categories: UniversalCategory[] = []
  const categoryIdToName = new Map<string | number, string>()
  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      if (c && (c.name || c.id)) {
        const catName = String(c.name || c.id).trim()
        const cleanName = catName.charAt(0).toUpperCase() + catName.slice(1)
        categories.push({
          id: c.id !== undefined ? c.id : cleanName.toLowerCase(),
          name: cleanName,
          icon: c.icon,
          color: c.color,
          enabled: c.enabled !== false,
        })
        if (c.id !== undefined) {
          categoryIdToName.set(c.id, cleanName)
          categoryIdToName.set(String(c.id), cleanName)
          categoryIdToName.set(String(c.id).toLowerCase(), cleanName)
        }
      }
    }
  }

  // 3. Extract Raw Words / Flashcards / Objects
  let rawList: any[] = []
  if (Array.isArray(data)) {
    rawList = data
  } else if (Array.isArray(data.words)) {
    rawList = data.words
  } else if (Array.isArray(data.flashcards)) {
    rawList = data.flashcards
  } else if (Array.isArray(data.cards)) {
    rawList = data.cards
  } else if (Array.isArray(data.objects)) {
    rawList = data.objects
  } else {
    throw new Error('No words, flashcards, or objects found in the backup file.')
  }

  const words: UniversalWordItem[] = []
  const seenWordKeys = new Set<string>()
  let hasImageCount = 0
  let hasAudioCount = 0

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object') continue

    const rawWord = String(
      raw.name || raw.word || raw.text || raw.englishWord || raw.title || ''
    ).trim()

    if (!rawWord) continue

    const lower = rawWord.toLowerCase()
    if (seenWordKeys.has(lower)) continue
    seenWordKeys.add(lower)

    const upper = rawWord.toUpperCase()
    const title = rawWord.charAt(0).toUpperCase() + rawWord.slice(1)
    const hindiWord = String(raw.secondLanguageName || raw.hindiWord || '').trim()

    // Alternate names
    const alternateNames: string[] = Array.isArray(raw.alternateNames)
      ? raw.alternateNames.map(String).map((s: string) => s.trim()).filter(Boolean)
      : []

    // Determine category name
    let categoryName = 'General'
    if (raw.category && typeof raw.category === 'string' && raw.category.trim()) {
      categoryName = raw.category.trim()
    } else if (raw.categoryId !== undefined && categoryIdToName.has(raw.categoryId)) {
      categoryName = categoryIdToName.get(raw.categoryId)!
    } else if (raw.categoryId !== undefined && categoryIdToName.has(String(raw.categoryId).toLowerCase())) {
      categoryName = categoryIdToName.get(String(raw.categoryId).toLowerCase())!
    } else if (typeof raw.categoryId === 'string' && raw.categoryId.trim()) {
      categoryName = raw.categoryId.trim()
    }
    categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)

    // Extract image
    let imageDataUrl: string | undefined = undefined
    const candidateImage =
      raw.imageDataUrl ||
      raw.imageBase64 ||
      raw.image ||
      raw.imageSrc ||
      raw.imageUrl ||
      raw.imageBlob
    if (candidateImage) {
      imageDataUrl = normalizeImageDataUrl(candidateImage)
    }
    if (!imageDataUrl) {
      const candidateKeys = [
        raw.imageId ? String(raw.imageId) : null,
        raw.imageId ? String(raw.imageId).toLowerCase() : null,
        raw.id ? String(raw.id) : null,
        raw.id ? String(raw.id).toLowerCase() : null,
        `img-${lower}`,
        `image_${lower}`,
      ].filter(Boolean) as string[]

      for (const k of candidateKeys) {
        if (mediaMap.has(k)) {
          const m = mediaMap.get(k)
          if (m?.data) {
            imageDataUrl = normalizeImageDataUrl(m.data)
            if (imageDataUrl) break
          }
        }
      }
    }
    if (imageDataUrl) hasImageCount++

    // Extract audio
    let audioDataUrl: string | undefined = undefined
    const candidateAudio =
      raw.audioDataUrl ||
      raw.englishAudioBase64 ||
      raw.audio ||
      raw.audioBase64 ||
      raw.voiceDataUrl ||
      raw.voice ||
      raw.sound ||
      raw.englishAudio ||
      raw.audioBlob

    if (candidateAudio) {
      audioDataUrl = normalizeAudioDataUrl(candidateAudio)
    }

    if (!audioDataUrl) {
      const candidateKeys = [
        raw.audioId ? String(raw.audioId) : null,
        raw.audioId ? String(raw.audioId).toLowerCase() : null,
        `aud-${lower}`,
        `audio_${lower}`,
        `aud-${raw.id}`,
        `audio_${raw.id}`,
        `${lower}.mp3`,
        `${lower}.wav`,
        `${lower}.webm`,
        raw.id ? String(raw.id) : null,
        raw.id ? String(raw.id).toLowerCase() : null,
      ].filter(Boolean) as string[]

      for (const k of candidateKeys) {
        if (mediaMap.has(k)) {
          const m = mediaMap.get(k)
          if (m?.data) {
            const isAudio =
              m.mimeType?.startsWith('audio/') ||
              k.startsWith('aud') ||
              k.endsWith('.mp3') ||
              k.endsWith('.wav') ||
              k.endsWith('.webm') ||
              k === raw.audioId
            if (isAudio) {
              audioDataUrl = normalizeAudioDataUrl(m.data)
              if (audioDataUrl) break
            }
          }
        }
      }
    }
    if (audioDataUrl) hasAudioCount++

    // Extract Hindi audio if present
    let hindiAudioBase64: string | undefined = undefined
    const candidateHindiAudio =
      raw.hindiAudioBase64 ||
      raw.hindiAudioDataUrl ||
      raw.hindiAudio ||
      raw.hindiVoice

    if (candidateHindiAudio) {
      hindiAudioBase64 = normalizeAudioDataUrl(candidateHindiAudio)
    }

    const builtInImage = raw.builtInImage ? String(raw.builtInImage).trim().toLowerCase() : undefined

    words.push({
      id: raw.id ? String(raw.id) : `obj_${lower}_${Date.now()}`,
      word: lower,
      text: upper,
      englishWord: title,
      hindiWord,
      category: categoryName,
      categoryId: raw.categoryId ?? categoryName.toLowerCase(),
      alternateNames: alternateNames.length > 0 ? alternateNames : undefined,
      imageDataUrl,
      imageBase64: imageDataUrl,
      audioDataUrl,
      englishAudioBase64: audioDataUrl,
      hindiAudioBase64,
      builtInImage,
      imageId: raw.imageId ? String(raw.imageId) : (imageDataUrl ? `img-${lower}` : undefined),
      audioId: raw.audioId ? String(raw.audioId) : (audioDataUrl ? `aud-${lower}` : undefined),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      length: typeof raw.length === 'number' ? raw.length : rawWord.length,
      enabled: raw.enabled !== false,
      favorite: Boolean(raw.favorite),
      orderIndex: typeof raw.orderIndex === 'number' ? raw.orderIndex : undefined,
    })
  }

  if (words.length === 0) {
    throw new Error('No valid words or objects found in the backup file.')
  }

  // 4. Ensure implicit categories exist
  const existingCatNames = new Set(categories.map((c) => c.name.toLowerCase()))
  for (const w of words) {
    if (!existingCatNames.has(w.category.toLowerCase())) {
      categories.push({
        id: w.category.toLowerCase(),
        name: w.category,
        icon: '📁',
        color: '#8B5CF6',
        enabled: true,
      })
      existingCatNames.add(w.category.toLowerCase())
    }
  }

  return {
    words,
    categories,
    hasImageCount,
    hasAudioCount,
    appName: data.appName,
    exportedAt: data.exportedAt || data.exportDate || data.timestamp,
    rawSettings: data.settings,
  }
}

/**
 * Creates the universal export JSON string containing all formats for universal compatibility across:
 * - CogniCard (reads flashcards & words with imageBase64 / englishAudioBase64 / audioDataUrl)
 * - TraceTheWord (reads words, media array, and categories)
 * - WordLearn (reads words with imageDataUrl & audioDataUrl and categories)
 * - Zumi (reads objects, words, and settings)
 */
export function createUniversalWordPack(params: {
  appName: string
  words: UniversalWordItem[]
  categories?: UniversalCategory[]
  media?: UniversalMediaItem[]
  settings?: any
}): string {
  const { appName, words, settings } = params

  const categories: UniversalCategory[] = params.categories && params.categories.length > 0
    ? [...params.categories]
    : [{ id: 'objects', name: 'Objects', color: '#f43f5e', enabled: true }]

  // Build media items
  const mediaList: UniversalMediaItem[] = params.media ? [...params.media] : []
  const existingMediaIds = new Set(mediaList.map((m) => m.id))

  for (const w of words) {
    const normAudio = normalizeAudioDataUrl(w.audioDataUrl || w.englishAudioBase64)
    const normImage = normalizeImageDataUrl(w.imageDataUrl || w.imageBase64)

    if (normAudio) {
      w.audioDataUrl = normAudio
      w.englishAudioBase64 = normAudio
      if (!w.audioId) {
        w.audioId = `aud-${w.word.toLowerCase()}`
      }
      if (!existingMediaIds.has(w.audioId)) {
        const mime = normAudio.match(/data:([^;]+);/)?.[1] || 'audio/mp3'
        mediaList.push({
          id: w.audioId,
          type: 'audio',
          data: normAudio,
          mimeType: mime,
        })
        existingMediaIds.add(w.audioId)
      }
    }

    if (normImage) {
      w.imageDataUrl = normImage
      w.imageBase64 = normImage
      if (!w.imageId) {
        w.imageId = `img-${w.word.toLowerCase()}`
      }
      if (!existingMediaIds.has(w.imageId)) {
        const mime = normImage.match(/data:([^;]+);/)?.[1] || 'image/png'
        mediaList.push({
          id: w.imageId,
          type: 'image',
          data: normImage,
          mimeType: mime,
        })
        existingMediaIds.add(w.imageId)
      }
    }
  }

  // Format flashcards for legacy CogniCard parser compatibility
  const flashcards = words.map((w, idx) => ({
    id: typeof w.categoryId === 'number' ? idx + 1 : w.id || idx + 1,
    categoryId: w.categoryId,
    englishWord: w.englishWord,
    hindiWord: w.hindiWord || w.englishWord,
    imagePath: '',
    imageBase64: w.imageDataUrl || w.imageBase64 || '',
    englishAudioBase64: w.audioDataUrl || w.englishAudioBase64 || '',
    hindiAudioBase64: w.hindiAudioBase64 || '',
  }))

  // Format native Zumi objects
  const objects = words.map((w) => ({
    id: w.id,
    name: w.englishWord || w.word,
    normalizedName: w.word.toLowerCase(),
    alternateNames: w.alternateNames,
    secondLanguageName: w.hindiWord || undefined,
    imageBase64: w.imageDataUrl || w.imageBase64 || '',
    mimeType: w.imageDataUrl?.match(/data:([^;]+);/)?.[1] || 'image/png',
    audioBase64: w.audioDataUrl || w.englishAudioBase64 || undefined,
    audioMimeType: w.audioDataUrl?.match(/data:([^;]+);/)?.[1] || undefined,
    createdAt: w.createdAt || Date.now(),
    updatedAt: Date.now(),
  }))

  const payload: UniversalWordPack = {
    version: 2,
    format: 'universal-word-pack',
    appName,
    exportedAt: new Date().toISOString(),
    totalWords: words.length,
    totalCategories: categories.length,
    categories,
    words,
    flashcards,
    cards: flashcards,
    objects,
    media: mediaList,
    settings,
  }

  return JSON.stringify(payload, null, 2)
}
