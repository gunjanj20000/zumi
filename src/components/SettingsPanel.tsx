import React, { useState, useRef } from 'react'
import type { AppSettings, ObjectCard } from '../types/types'
import { exportBackup, importBackup } from '../services/backup'
import {
  Mic,
  ShieldCheck,
  Smartphone,
  Eye,
  Check,
  Download,
  Upload,
  Database,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface SettingsPanelProps {
  settings: AppSettings
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>
  objects?: ObjectCard[]
  onRefreshObjects?: () => Promise<void>
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
  objects = [],
  onRefreshObjects,
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setStatusMessage(null)
      const res = await exportBackup(objects, settings)
      setStatusMessage({
        type: 'success',
        text: `Exported ${res.objectCount} object${res.objectCount === 1 ? '' : 's'} and app preferences to backup file!`,
      })
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${err?.message || 'Unknown error'}`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      setStatusMessage(null)
      const res = await importBackup(file)
      if (onRefreshObjects) {
        await onRefreshObjects()
      }
      const total = res.objectsImported + res.objectsUpdated
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${total} object${total === 1 ? '' : 's'}${
          res.appName ? ` from ${res.appName}` : ''
        } (${res.hasImageCount} photos, ${res.hasAudioCount} audio clips)!`,
      })
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Import failed: ${err?.message || 'Invalid or corrupted backup file'}`,
      })
    } finally {
      setIsImporting(false)
      if (e.target) e.target.value = ''
    }
  }
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Voice Assistant Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-50">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Voice Assistant</h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure Zumi's wake words and listening behavior
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Voice Assistant Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-800 text-base">Enable Voice Assistant</div>
              <div className="text-xs text-slate-500">Allow Zumi to listen for commands</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.voiceAssistantEnabled}
                onChange={(e) => onUpdate({ voiceAssistantEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Always Listening Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-800 text-base">Always Listening Mode</div>
              <div className="text-xs text-slate-500">
                Continuously listens while Home page is active without pressing a button
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alwaysListening}
                onChange={(e) => onUpdate({ alwaysListening: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Wake Phrase Input */}
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
              Wake Phrase
            </label>
            <input
              type="text"
              value={settings.wakePhrase}
              onChange={(e) => onUpdate({ wakePhrase: e.target.value })}
              placeholder="Hey Zumi"
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm font-bold text-slate-800"
            />
            <p className="text-xs text-slate-400 mt-1">
              Default is "Hey Zumi". Zumi also recognizes natural variations like "Zumi" and "Hey Zumi, show...".
            </p>
          </div>

          {/* Recognition Language */}
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
              Recognition Language
            </label>
            <select
              value={settings.recognitionLanguage}
              onChange={(e) => onUpdate({ recognitionLanguage: e.target.value, ttsLanguage: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm font-bold text-slate-800 bg-white"
            >
              <option value="en-US">English (United States)</option>
              <option value="en-IN">English (India)</option>
              <option value="en-GB">English (United Kingdom)</option>
              <option value="hi-IN">Hindi (India) - हिन्दी</option>
            </select>
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-800 text-base">Auto Speak Object Name</div>
              <div className="text-xs text-slate-500">
                Automatically pronounce object name when displayed
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => onUpdate({ autoSpeak: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-50">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Appearance &amp; Display</h3>
            <p className="text-xs text-slate-500 font-medium">
              Child-friendly visual preferences
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Image Fit Mode */}
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">
              Image Scaling Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdate({ imageFit: 'contain' })}
                className={`py-3 px-4 rounded-2xl border-2 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  settings.imageFit === 'contain'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {settings.imageFit === 'contain' && <Check className="w-4 h-4 text-rose-500" />}
                Contain (No Cropping)
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ imageFit: 'cover' })}
                className={`py-3 px-4 rounded-2xl border-2 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  settings.imageFit === 'cover'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {settings.imageFit === 'cover' && <Check className="w-4 h-4 text-rose-500" />}
                Cover (Fill Card)
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              "Contain" keeps the original ratio without cutting any part of the object.
            </p>
          </div>

          {/* Show Second Language */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-800 text-base">Show Second Language</div>
              <div className="text-xs text-slate-500">
                Display bilingual names (e.g. सेब) beneath the main name
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showSecondLanguage}
                onChange={(e) => onUpdate({ showSecondLanguage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cheerful', name: 'Coral Rainbow', bg: 'from-rose-400 to-amber-400' },
                { id: 'sunset', name: 'Sunset Glow', bg: 'from-orange-400 to-pink-500' },
                { id: 'aqua', name: 'Aqua Sky', bg: 'from-sky-400 to-indigo-400' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onUpdate({ theme: theme.id as any })}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    settings.theme === theme.id
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full bg-gradient-to-r ${theme.bg}`}></div>
                  <span className="text-xs font-bold text-slate-700">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Backup & Data Portability (Export / Import) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-50">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Backup &amp; Data Portability</h3>
            <p className="text-xs text-slate-500 font-medium">
              Export and import your custom objects, images, audio recordings, and preferences
            </p>
          </div>
        </div>

        {/* Feedback notification message */}
        {statusMessage && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Button */}
          <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/60 flex flex-col justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" /> Export Backup
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Download a JSON backup of your entire library ({objects.length} object{objects.length === 1 ? '' : 's'}), custom audio clips, and preferences to keep safe or move to another device.
              </p>
            </div>
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={handleExport}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Exporting…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Export All Data
                </>
              )}
            </button>
          </div>

          {/* Import Button */}
          <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/60 flex flex-col justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-rose-600" /> Import Backup
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Restore objects and preferences from a previously exported <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">.json</code> backup file.
              </p>
            </div>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={() => importFileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-700 font-extrabold text-xs sm:text-sm border-2 border-slate-200 hover:border-rose-300 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Import Backup File
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Offline Storage, Privacy & Native Architecture */}
      <section className="bg-gradient-to-tr from-amber-50 to-rose-50/40 rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xs">
        <h4 className="text-base font-black text-slate-800 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Offline-First &amp; 100% Local Privacy
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
          All images, names, and speech processing are handled entirely inside your device using IndexedDB and the Web Speech API. No photos or voice recordings are ever sent to an external server.
        </p>

        <div className="pt-3 border-t border-rose-100 flex items-center gap-2 text-xs font-bold text-slate-600">
          <Smartphone className="w-4 h-4 text-rose-500" />
          <span>Ready for offline PWA installation &amp; future Capacitor packaging.</span>
        </div>
      </section>
    </div>
  )
}
