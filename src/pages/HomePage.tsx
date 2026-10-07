import React, { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ObjectCard, AppSettings, MatchResult } from '../types/types'
import { SearchBox } from '../components/SearchBox'
import { SuggestionList } from '../components/SuggestionList'
import { ObjectDisplay } from '../components/ObjectDisplay'
import { VoiceStatus } from '../components/VoiceStatus'
import { ObjectThumbnail } from '../components/ObjectThumbnail'
import { objectMatcher } from '../services/objectMatcher'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { Settings as SettingsIcon, Sparkles, HelpCircle } from 'lucide-react'

interface HomePageProps {
  objects: ObjectCard[]
  settings: AppSettings
  onLoadStarterPack: () => Promise<any>
}

export const HomePage: React.FC<HomePageProps> = ({
  objects,
  settings,
  onLoadStarterPack,
}) => {
  const [typedQuery, setTypedQuery] = useState('')
  const [selectedObject, setSelectedObject] = useState<ObjectCard | null>(null)
  const [disambiguationChoices, setDisambiguationChoices] = useState<ObjectCard[] | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  const { speak, isSpeaking } = useTextToSpeech(settings.ttsLanguage || 'en-US')

  // Instant in-memory typed suggestions
  const suggestions = useMemo(() => {
    if (!typedQuery.trim()) return []
    return objectMatcher.getSuggestions(typedQuery, 6)
  }, [typedQuery])

  // Handler when an object is chosen
  const handleSelectObject = useCallback(
    async (obj: ObjectCard) => {
      setSelectedObject(obj)
      setTypedQuery('')
      setDisambiguationChoices(null)

      if (settings.autoSpeak) {
        try {
          await speak(obj.name, settings.ttsLanguage)
        } catch {
          // ignore
        }
      }
    },
    [settings.autoSpeak, settings.ttsLanguage, speak]
  )

  // Voice Assistant callback
  const handleVoiceMatch = useCallback(
    (result: MatchResult) => {
      if (result.status === 'exact' || result.status === 'confident') {
        if (result.object) {
          handleSelectObject(result.object)
        }
      } else if (result.status === 'ambiguous' && result.candidates && result.candidates.length > 0) {
        setDisambiguationChoices(result.candidates)
      } else if (result.status === 'none') {
        setDisambiguationChoices(null)
      }
    },
    [handleSelectObject]
  )

  // Voice Assistant hook with always-listening enabled
  const {
    state: voiceState,
    stateDetail: voiceStateDetail,
    liveTranscript,
    error: voiceError,
    isSupported: isVoiceSupported,
    restartListening,
  } = useVoiceAssistant({
    settings,
    onMatchedObject: handleVoiceMatch,
    active: true,
  })

  // Handle manual search submit (pressing Enter)
  const handleSearchSubmit = () => {
    if (!typedQuery.trim()) return
    const match = objectMatcher.matchObject(typedQuery)
    if (match.object) {
      handleSelectObject(match.object)
    } else if (match.candidates && match.candidates.length > 0) {
      setDisambiguationChoices(match.candidates)
    }
  }

  const handleSeed = async () => {
    try {
      setIsSeeding(true)
      await onLoadStarterPack()
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-5 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-3 mb-3 sm:mb-5">
        {/* App Title & Assistant Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-md shadow-rose-200">
            <span className="text-xl sm:text-2xl">🧸</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none m-0">
              OBJECT SPEAKER
            </h1>
            <p className="text-xs sm:text-sm font-bold text-rose-500 tracking-wide mt-0.5">
              ZUMI VOICE ASSISTANT
            </p>
          </div>
        </div>

        {/* Right side: Voice Status & Settings link */}
        <div className="flex items-center gap-2 sm:gap-4">
          <VoiceStatus
            state={voiceState}
            stateDetail={voiceStateDetail}
            liveTranscript={liveTranscript}
            errorMessage={voiceError}
            isSupported={isVoiceSupported}
            onRestart={restartListening}
          />

          <Link
            to="/settings"
            title="Settings & Object Library"
            aria-label="Settings"
            className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-rose-100 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </div>
      </header>

      {/* Search Bar Section */}
      <div className="relative z-20 w-full mb-4 sm:mb-6">
        <SearchBox
          value={typedQuery}
          onChange={setTypedQuery}
          onClear={() => setTypedQuery('')}
          onSubmit={handleSearchSubmit}
          placeholder="Type an object name… (e.g. Apple)"
        />

        {/* Autocomplete Dropdown */}
        <SuggestionList
          suggestions={suggestions}
          query={typedQuery}
          onSelect={handleSelectObject}
        />
      </div>

      {/* Disambiguation: "Did you mean?" card */}
      {disambiguationChoices && disambiguationChoices.length > 0 && (
        <div className="w-full max-w-xl mx-auto mb-4 p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-md animate-fadeIn text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-900 font-extrabold text-sm mb-3">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Did you mean one of these?</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {disambiguationChoices.map((cand) => (
              <button
                key={cand.id}
                onClick={() => handleSelectObject(cand)}
                className="p-2 rounded-2xl bg-white hover:bg-amber-100/70 border border-amber-200 transition-all flex flex-col items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 overflow-hidden flex items-center justify-center">
                  <ObjectThumbnail blob={cand.imageBlob} alt={cand.name} />
                </div>
                <span className="font-extrabold text-xs text-slate-800 truncate w-full">
                  {cand.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Object Display Area */}
      <main className="flex-1 flex flex-col justify-center items-center my-auto w-full">
        {objects.length === 0 ? (
          <div className="w-full max-w-xl mx-auto my-auto p-8 sm:p-12 text-center bg-white rounded-3xl sm:rounded-[36px] border-2 border-dashed border-rose-200 shadow-lg flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 mb-4 animate-gentle-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
              No objects added yet.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium mb-8 max-w-md">
              Add your first photo cards so your child can ask Zumi for familiar objects!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Link
                to="/settings"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-sm sm:text-base shadow-md shadow-rose-200 transition-all text-center"
              >
                Add Your First Object
              </Link>
              <button
                type="button"
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-sm sm:text-base transition-colors cursor-pointer text-center"
              >
                {isSeeding ? 'Loading Starter…' : 'Load Starter Pack'}
              </button>
            </div>
          </div>
        ) : (
          <ObjectDisplay
            object={selectedObject}
            imageFit={settings.imageFit}
            showSecondLanguage={settings.showSecondLanguage}
            isSpeaking={isSpeaking}
            onReplaySpeak={() => {
              if (selectedObject) {
                speak(selectedObject.name, settings.ttsLanguage)
              }
            }}
          />
        )}
      </main>

      {/* Quick Objects Carousel / Bottom Bar */}
      {objects.length > 0 && (
        <footer className="mt-4 sm:mt-6 pt-3 border-t border-rose-100/70">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-1">
            <span>Tap any object:</span>
            <span>{objects.length} in library</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {objects.map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => handleSelectObject(obj)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border-2 flex items-center gap-2 flex-shrink-0 transition-all cursor-pointer font-extrabold text-xs sm:text-sm ${
                  selectedObject?.id === obj.id
                    ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-200 scale-105'
                    : 'border-white bg-white hover:border-rose-200 text-slate-700 shadow-xs'
                }`}
              >
                <div className="w-5 h-5 rounded-lg overflow-hidden flex items-center justify-center bg-amber-50">
                  <ObjectThumbnail blob={obj.imageBlob} alt={obj.name} />
                </div>
                <span>{obj.name}</span>
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  )
}
