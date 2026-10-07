import { useState, useEffect, useCallback } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import type { AppSettings } from './types/types'
import { getAppSettings, updateAppSettings, DEFAULT_SETTINGS } from './services/database'
import { useObjects } from './hooks/useObjects'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const {
    objects,
    isLoading: isObjectsLoading,
    addObject,
    updateObject,
    removeObject,
    seedStarterObjects,
  } = useObjects()

  // Load app settings from IndexedDB
  useEffect(() => {
    async function load() {
      try {
        const loaded = await getAppSettings()
        setSettings(loaded)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setSettingsLoaded(true)
      }
    }
    load()
  }, [])

  const handleUpdateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    try {
      const updated = await updateAppSettings(partial)
      setSettings(updated)
    } catch (err) {
      console.error('Failed to update settings:', err)
    }
  }, [])

  // Apply theme background gradient
  const themeClass =
    settings.theme === 'sunset'
      ? 'from-orange-50 via-amber-50/50 to-rose-50'
      : settings.theme === 'aqua'
        ? 'from-sky-50 via-teal-50/40 to-indigo-50'
        : 'from-amber-50/60 via-orange-50/40 to-rose-50/60'

  if (!settingsLoaded && isObjectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="flex flex-col items-center gap-3 text-rose-500 font-extrabold animate-pulse">
          <span className="text-4xl">🧸</span>
          <span className="text-lg tracking-wide">Waking up Zumi…</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${themeClass} transition-colors duration-500`}>
      <HashRouter>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                objects={objects}
                settings={settings}
                onLoadStarterPack={seedStarterObjects}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                objects={objects}
                settings={settings}
                onAddObject={addObject}
                onUpdateObject={updateObject}
                onDeleteObject={removeObject}
                onUpdateSettings={handleUpdateSettings}
                onLoadStarterPack={seedStarterObjects}
              />
            }
          />
        </Routes>
      </HashRouter>
    </div>
  )
}

export default App
