import type { ObjectCard, AppSettings } from '../types/types'
import { getAllObjects, saveObject, updateAppSettings } from './database'
import {
  parseAnyWordPack,
  createUniversalWordPack,
  dataUrlToBlob,
  blobToDataUrl,
  type UniversalWordItem,
  type UniversalCategory,
} from './universalWordPack'

export { dataUrlToBlob } from './universalWordPack'

/**
 * Backwards compatibility helper for converting a Blob to a base64 Data URL.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return blobToDataUrl(blob)
}

/**
 * Creates an attractive SVG vector placeholder if a word imported from another app lacks an image.
 */
function createPlaceholderImageBlob(name: string): Blob {
  const char = (name.trim()[0] || '?').toUpperCase()
  const cleanName = name.trim().toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <defs>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f43f5e"/>
        <stop offset="100%" stop-color="#fb923c"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" rx="60" fill="url(#cardGrad)"/>
    <circle cx="300" cy="270" r="140" fill="#ffffff" opacity="0.2"/>
    <text x="300" y="320" font-size="160" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${char}</text>
    <text x="300" y="490" font-size="44" font-weight="800" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" text-anchor="middle" letter-spacing="2">${cleanName}</text>
  </svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export interface BackupExportResult {
  jsonString: string
  objectCount: number
  hasAudioCount: number
  hasImageCount: number
}

/**
 * Exports all objects and app settings in the Universal Word Pack format
 * shared seamlessly across CogniCard, WordLearn, TraceTheWord, and Zumi.
 */
export async function exportBackup(
  objects: ObjectCard[],
  settings?: AppSettings
): Promise<BackupExportResult> {
  let hasAudioCount = 0
  let hasImageCount = 0

  const universalWords: UniversalWordItem[] = await Promise.all(
    objects.map(async (obj, idx) => {
      const cleanName = obj.name.trim()
      const lower = cleanName.toLowerCase()
      const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)

      const imageDataUrl = await blobToDataUrl(obj.imageBlob, obj.mimeType || 'image/webp')
      hasImageCount++

      let audioDataUrl: string | undefined = undefined
      if (obj.audioBlob) {
        audioDataUrl = await blobToDataUrl(obj.audioBlob, obj.audioMimeType || 'audio/webm')
        hasAudioCount++
      }

      return {
        id: obj.id || `obj_${lower}_${Date.now()}_${idx}`,
        word: lower,
        text: cleanName.toUpperCase(),
        englishWord: title,
        hindiWord: obj.secondLanguageName || '',
        category: 'Objects',
        categoryId: 'objects',
        alternateNames: obj.alternateNames,
        imageDataUrl,
        imageBase64: imageDataUrl,
        audioDataUrl,
        englishAudioBase64: audioDataUrl,
        createdAt: obj.createdAt || Date.now(),
        orderIndex: idx,
        enabled: true,
      }
    })
  )

  const categories: UniversalCategory[] = [
    {
      id: 'objects',
      name: 'Objects',
      color: '#f43f5e',
      icon: '🧸',
      enabled: true,
    },
  ]

  const jsonString = createUniversalWordPack({
    appName: 'Zumi Voice Assistant',
    words: universalWords,
    categories,
    settings,
  })

  // Trigger browser download if document is available
  if (typeof document !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().slice(0, 10)
    a.download = `zumi-backup-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    jsonString,
    objectCount: universalWords.length,
    hasAudioCount,
    hasImageCount,
  }
}

export interface BackupImportResult {
  objectsImported: number
  objectsUpdated: number
  hasAudioCount: number
  hasImageCount: number
  appName?: string
  settingsUpdated: boolean
}

/**
 * Imports any backup file from:
 * 1. CogniCard (categories + flashcards with englishWord, hindiWord, englishAudioBase64, imageBase64)
 * 2. WordLearn (words with audioDataUrl, imageDataUrl + categories)
 * 3. TraceTheWord (words + media store + categories)
 * 4. Universal Word Pack (v2 format with words, media, categories)
 * 5. Zumi native (objects with imageBase64, audioBase64)
 */
export async function importBackup(file: File | string): Promise<BackupImportResult> {
  let content: string
  if (typeof file === 'string') {
    content = file
  } else {
    content = await file.text()
  }

  // Parse using universal interchange parser
  const parsed = parseAnyWordPack(content)

  // Fetch existing objects to merge cleanly without duplicate names
  const existingList = await getAllObjects()
  const existingByName = new Map<string, ObjectCard>()
  for (const obj of existingList) {
    existingByName.set(obj.name.trim().toLowerCase(), obj)
    existingByName.set(obj.normalizedName.trim().toLowerCase(), obj)
  }

  let objectsImported = 0
  let objectsUpdated = 0

  for (const item of parsed.words) {
    const wordName = (item.englishWord || item.word || '').trim()
    if (!wordName) continue

    const normKey = wordName.toLowerCase()
    const existing = existingByName.get(normKey)

    // Image Blob: from backup or placeholder
    let imageBlob: Blob
    let mimeType = 'image/png'
    if (item.imageDataUrl) {
      imageBlob = dataUrlToBlob(item.imageDataUrl, 'image/png')
      mimeType = imageBlob.type || 'image/png'
    } else if (existing?.imageBlob) {
      imageBlob = existing.imageBlob
      mimeType = existing.mimeType || 'image/webp'
    } else {
      imageBlob = createPlaceholderImageBlob(wordName)
      mimeType = 'image/svg+xml'
    }

    // Audio Blob: from backup or existing
    let audioBlob: Blob | undefined = undefined
    let audioMimeType: string | undefined = undefined
    const audioUrl = item.audioDataUrl || item.englishAudioBase64
    if (audioUrl) {
      audioBlob = dataUrlToBlob(audioUrl, 'audio/mp3')
      audioMimeType = audioBlob.type || 'audio/mp3'
    } else if (existing?.audioBlob) {
      audioBlob = existing.audioBlob
      audioMimeType = existing.audioMimeType
    }

    const secondLanguageName = item.hindiWord || existing?.secondLanguageName || undefined
    const alternateNames = item.alternateNames && item.alternateNames.length > 0
      ? item.alternateNames
      : existing?.alternateNames

    const cardId = existing?.id || item.id || `obj_${normKey}_${Date.now()}`

    await saveObject({
      id: cardId,
      name: wordName.charAt(0).toUpperCase() + wordName.slice(1),
      alternateNames,
      secondLanguageName,
      imageBlob,
      mimeType,
      audioBlob,
      audioMimeType,
      createdAt: existing?.createdAt || item.createdAt || Date.now(),
      updatedAt: Date.now(),
    })

    if (existing) {
      objectsUpdated++
    } else {
      objectsImported++
    }
  }

  // Restore compatible preferences if present
  let settingsUpdated = false
  if (parsed.rawSettings && typeof parsed.rawSettings === 'object') {
    try {
      const allowedKeys: (keyof AppSettings)[] = [
        'voiceAssistantEnabled',
        'alwaysListening',
        'wakePhrase',
        'recognitionLanguage',
        'ttsLanguage',
        'autoSpeak',
        'imageFit',
        'showSecondLanguage',
        'theme',
      ]
      const toUpdate: Partial<AppSettings> = {}
      for (const k of allowedKeys) {
        if (parsed.rawSettings[k] !== undefined) {
          ;(toUpdate as any)[k] = parsed.rawSettings[k]
        }
      }
      if (Object.keys(toUpdate).length > 0) {
        await updateAppSettings(toUpdate)
        settingsUpdated = true
      }
    } catch {
      // ignore
    }
  }

  return {
    objectsImported,
    objectsUpdated,
    hasAudioCount: parsed.hasAudioCount,
    hasImageCount: parsed.hasImageCount,
    appName: parsed.appName,
    settingsUpdated,
  }
}
