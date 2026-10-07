import React from 'react'
import type { AppSettings } from '../types/types'
import {
  Mic,
  ShieldCheck,
  Smartphone,
  Eye,
  Check,
} from 'lucide-react'

interface SettingsPanelProps {
  settings: AppSettings
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
}) => {
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
