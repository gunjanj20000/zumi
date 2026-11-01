import Dexie, { type Table } from 'dexie'
import type { ObjectCard, AppSettings } from '../types/types'
import { normalizeText } from '../utils/normalization'
import { createVectorIllustrationBlob } from './imageProcessing'
import { blobToDataUrl, dataUrlToBlob } from './universalWordPack'

export class ObjectSpeakerDatabase extends Dexie {
  objects!: Table<ObjectCard, string>
  settings!: Table<AppSettings, number>

  constructor() {
    super('ObjectSpeakerDB')

    this.version(1).stores({
      objects: 'id, name, normalizedName, *normalizedAlternateNames, createdAt, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new ObjectSpeakerDatabase()

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  voiceAssistantEnabled: false,
  alwaysListening: true,
  wakePhrase: 'Hey Zumi',
  recognitionLanguage: 'en-US',
  ttsLanguage: 'en-US',
  autoSpeak: true,
  imageFit: 'contain',
  showSecondLanguage: true,
  theme: 'cheerful',
}

/**
 * Loads current settings or creates defaults.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1)
  if (!existing) {
    await db.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return existing
}

/**
 * Saves app settings.
 */
export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings()
  const updated: AppSettings = { ...current, ...settings, id: 1 }
  await db.settings.put(updated)
  return updated
}

/**
 * Ensures an ObjectCard loaded from IndexedDB is valid.
 * If IndexedDB/WebView detached or cleared the Blob binary payload (a known issue in
 * Android WebView/Chromium where Blobs turn into 0-byte or {} on restart),
 * this automatically resurrects the image and audio from permanent base64 data URLs.
 * Also upgrades older records that lacked imageDataUrl.
 */
async function sanitizeObjectCard(obj: ObjectCard): Promise<ObjectCard> {
  let needsDbUpdate = false

  // Image validation & restoration
  const isBlobValid =
    obj.imageBlob &&
    (obj.imageBlob instanceof Blob || typeof (obj.imageBlob as any).slice === 'function') &&
    obj.imageBlob.size > 0
  const hasDataUrl = typeof obj.imageDataUrl === 'string' && obj.imageDataUrl.length > 20

  if (!isBlobValid && hasDataUrl) {
    try {
      obj.imageBlob = dataUrlToBlob(obj.imageDataUrl!, obj.mimeType || 'image/png')
      needsDbUpdate = true
    } catch {
      // ignore
    }
  } else if (isBlobValid && !hasDataUrl) {
    try {
      obj.imageDataUrl = await blobToDataUrl(obj.imageBlob!, obj.mimeType || 'image/webp')
      needsDbUpdate = true
    } catch {
      // ignore
    }
  }

  // Audio validation & restoration
  const isAudioBlobValid =
    obj.audioBlob &&
    (obj.audioBlob instanceof Blob || typeof (obj.audioBlob as any).slice === 'function') &&
    obj.audioBlob.size > 0
  const hasAudioDataUrl = typeof obj.audioDataUrl === 'string' && obj.audioDataUrl.length > 20

  if (!isAudioBlobValid && hasAudioDataUrl) {
    try {
      obj.audioBlob = dataUrlToBlob(obj.audioDataUrl!, obj.audioMimeType || 'audio/mp3')
      needsDbUpdate = true
    } catch {
      // ignore
    }
  } else if (isAudioBlobValid && !hasAudioDataUrl) {
    try {
      obj.audioDataUrl = await blobToDataUrl(obj.audioBlob!, obj.audioMimeType || 'audio/webm')
      needsDbUpdate = true
    } catch {
      // ignore
    }
  }

  if (needsDbUpdate) {
    db.objects.put(obj).catch(() => {})
  }

  return obj
}

/**
 * Fetches all objects from IndexedDB with automatic resilience & restoration.
 */
export async function getAllObjects(): Promise<ObjectCard[]> {
  const list = await db.objects.orderBy('createdAt').reverse().toArray()
  return Promise.all(list.map((o) => sanitizeObjectCard(o)))
}

/**
 * Fetches a single object by ID.
 */
export async function getObjectById(id: string): Promise<ObjectCard | undefined> {
  const item = await db.objects.get(id)
  return item ? sanitizeObjectCard(item) : undefined
}

/**
 * Saves or updates an object in IndexedDB with dual Blob & Data URL persistence.
 */
export async function saveObject(
  object: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'> & {
    normalizedName?: string
    normalizedAlternateNames?: string[]
  }
): Promise<ObjectCard> {
  const normalizedName = normalizeText(object.name)
  const normalizedAlternateNames = (object.alternateNames || [])
    .map((name) => normalizeText(name))
    .filter(Boolean)

  let imageDataUrl = object.imageDataUrl
  let imageBlob = object.imageBlob

  // If imageDataUrl provided but imageBlob is missing or 0-byte, create imageBlob
  if (imageDataUrl && (!imageBlob || !(imageBlob instanceof Blob) || imageBlob.size === 0)) {
    try {
      imageBlob = dataUrlToBlob(imageDataUrl, object.mimeType || 'image/png')
    } catch {
      // ignore
    }
  }

  // If imageBlob is valid but imageDataUrl is missing, generate permanent imageDataUrl
  if (imageBlob instanceof Blob && imageBlob.size > 0 && (!imageDataUrl || imageDataUrl.length < 20)) {
    try {
      imageDataUrl = await blobToDataUrl(imageBlob, object.mimeType || 'image/webp')
    } catch {
      // ignore
    }
  }

  let audioDataUrl = object.audioDataUrl
  let audioBlob = object.audioBlob

  if (audioDataUrl && (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0)) {
    try {
      audioBlob = dataUrlToBlob(audioDataUrl, object.audioMimeType || 'audio/mp3')
    } catch {
      // ignore
    }
  }

  if (audioBlob instanceof Blob && audioBlob.size > 0 && (!audioDataUrl || audioDataUrl.length < 20)) {
    try {
      audioDataUrl = await blobToDataUrl(audioBlob, object.audioMimeType || 'audio/webm')
    } catch {
      // ignore
    }
  }

  const card: ObjectCard = {
    ...object,
    imageBlob: imageBlob || new Blob([]),
    imageDataUrl,
    audioBlob,
    audioDataUrl,
    normalizedName,
    normalizedAlternateNames,
    updatedAt: Date.now(),
  }

  await db.objects.put(card)
  return card
}

/**
 * Deletes an object by ID from IndexedDB.
 */
export async function deleteObject(id: string): Promise<void> {
  await db.objects.delete(id)
}

/**
 * Seeds a starter set of objects for rapid testing / caregiver starter kit.
 * Only loaded when explicitly requested by user.
 */
export async function seedStarterPack(): Promise<ObjectCard[]> {
  const starterItems = [
    {
      id: 'starter-apple',
      name: 'Apple',
      alternateNames: ['seb', 'red apple', 'sweet apple'],
      secondLanguageName: 'सेब',
      type: 'apple' as const,
    },
    {
      id: 'starter-bhujia',
      name: 'Bhujia',
      alternateNames: ['bhujiya', 'bhujiaa', 'namkeen', 'sev'],
      secondLanguageName: 'भुजिया',
      type: 'bhujia' as const,
    },
    {
      id: 'starter-chocolate',
      name: 'Chocolate',
      alternateNames: ['choc', 'choccy', 'candy', 'sweet chocolate'],
      secondLanguageName: 'चॉकलेट',
      type: 'chocolate' as const,
    },
    {
      id: 'starter-ball',
      name: 'Ball',
      alternateNames: ['red ball', 'beach ball', 'toy ball', 'play ball'],
      secondLanguageName: 'गेंद',
      type: 'ball' as const,
    },
    {
      id: 'starter-milk',
      name: 'Milk',
      alternateNames: ['doodh', 'milk carton', 'warm milk'],
      secondLanguageName: 'दूध',
      type: 'milk' as const,
    },
  ]

  const createdCards: ObjectCard[] = []

  for (const item of starterItems) {
    const existing = await db.objects.get(item.id)
    if (!existing) {
      const blob = createVectorIllustrationBlob(item.type)
      const dataUrl = await blobToDataUrl(blob, 'image/svg+xml')
      const card = await saveObject({
        id: item.id,
        name: item.name,
        alternateNames: item.alternateNames,
        secondLanguageName: item.secondLanguageName,
        imageBlob: blob,
        imageDataUrl: dataUrl,
        mimeType: 'image/svg+xml',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      createdCards.push(card)
    } else {
      createdCards.push(await sanitizeObjectCard(existing))
    }
  }

  return createdCards
}
