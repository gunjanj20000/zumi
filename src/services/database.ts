import Dexie, { type Table } from 'dexie'
import type { ObjectCard, AppSettings } from '../types/types'
import { normalizeText } from '../utils/normalization'
import { createVectorIllustrationBlob } from './imageProcessing'

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
  voiceAssistantEnabled: true,
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
 * Fetches all objects from IndexedDB.
 */
export async function getAllObjects(): Promise<ObjectCard[]> {
  return await db.objects.orderBy('createdAt').reverse().toArray()
}

/**
 * Fetches a single object by ID.
 */
export async function getObjectById(id: string): Promise<ObjectCard | undefined> {
  return await db.objects.get(id)
}

/**
 * Saves or updates an object in IndexedDB.
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

  const card: ObjectCard = {
    ...object,
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
      const card = await saveObject({
        id: item.id,
        name: item.name,
        alternateNames: item.alternateNames,
        secondLanguageName: item.secondLanguageName,
        imageBlob: blob,
        mimeType: 'image/svg+xml',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      createdCards.push(card)
    } else {
      createdCards.push(existing)
    }
  }

  return createdCards
}
