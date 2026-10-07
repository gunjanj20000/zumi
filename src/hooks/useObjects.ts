import { useState, useEffect, useCallback } from 'react'
import type { ObjectCard } from '../types/types'
import {
  getAllObjects,
  saveObject,
  deleteObject,
  seedStarterPack,
} from '../services/database'
import { objectMatcher } from '../services/objectMatcher'

export function useObjects() {
  const [objects, setObjects] = useState<ObjectCard[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadObjects = useCallback(async () => {
    try {
      const list = await getAllObjects()
      setObjects(list)
      // Update in-memory matcher index immediately
      objectMatcher.updateIndex(list)
    } catch (err) {
      console.error('Failed to load objects from IndexedDB:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadObjects()
  }, [loadObjects])

  const addObject = useCallback(
    async (
      data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>
    ) => {
      const saved = await saveObject(data)
      await loadObjects()
      return saved
    },
    [loadObjects]
  )

  const updateObject = useCallback(
    async (
      data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>
    ) => {
      const saved = await saveObject(data)
      await loadObjects()
      return saved
    },
    [loadObjects]
  )

  const removeObject = useCallback(
    async (id: string) => {
      await deleteObject(id)
      await loadObjects()
    },
    [loadObjects]
  )

  const seedStarterObjects = useCallback(async () => {
    const seeded = await seedStarterPack()
    await loadObjects()
    return seeded
  }, [loadObjects])

  return {
    objects,
    isLoading,
    refreshObjects: loadObjects,
    addObject,
    updateObject,
    removeObject,
    seedStarterObjects,
  }
}
