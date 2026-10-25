import React, { useEffect, useRef } from 'react'
import type { ObjectCard, ImageFitMode } from '../types/types'
import { ObjectThumbnail } from './ObjectThumbnail'
import { Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

interface ObjectDisplayProps {
  object: ObjectCard | null
  imageFit?: ImageFitMode
  showSecondLanguage?: boolean
  isSpeaking?: boolean
  onReplaySpeak?: () => void
}

export const ObjectDisplay: React.FC<ObjectDisplayProps> = ({
  object,
  imageFit = 'contain',
  showSecondLanguage = true,
  isSpeaking = false,
  onReplaySpeak,
}) => {
  const lastObjectIdRef = useRef<string | null>(null)

  // Gentle confetti celebration when a new object appears
  useEffect(() => {
    if (object && object.id !== lastObjectIdRef.current) {
      lastObjectIdRef.current = object.id
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#f43f5e', '#fb923c', '#facc15', '#a855f7', '#38bdf8'],
          disableForReducedMotion: true,
        })
      } catch {
        // ignore
      }
    }
  }, [object])

  if (!object) {
    return (
      <div className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/70 backdrop-blur-sm rounded-3xl border-2 border-dashed border-rose-200 shadow-sm animate-fadeIn">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-100 to-amber-100 flex items-center justify-center mb-6 shadow-inner animate-gentle-bounce">
          <Sparkles className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
          Say an object name!
        </h2>
        <p className="text-base sm:text-lg text-slate-500 max-w-md font-medium leading-relaxed mb-6">
          Say <span className="font-bold text-rose-600">"Hey Zumi, show Apple"</span> or type an object name above.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100">
          <span>💡 Tip:</span>
          <span>You can also say "Hey Zumi, chocolate"</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center justify-center animate-fadeIn">
      {/* Main Responsive Card */}
      <div className="w-full bg-white rounded-3xl sm:rounded-[36px] p-4 sm:p-6 md:p-8 shadow-xl shadow-rose-950/5 border-2 border-rose-100 flex flex-col items-center transition-all duration-300">
        
        {/* Large Image Box (tap to speak / play recorded audio) */}
        <button
          type="button"
          onClick={onReplaySpeak}
          aria-label={`Play audio for ${object.name}`}
          className={`relative w-full aspect-square max-h-[50vh] sm:max-h-[55vh] lg:max-h-[60vh] bg-gradient-to-b from-amber-50/50 to-rose-50/30 rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex items-center justify-center overflow-hidden border border-rose-100/60 shadow-inner group cursor-pointer transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-400 select-none ${
            isSpeaking ? 'ring-4 ring-rose-400/80 shadow-rose-200' : ''
          }`}
        >
          <ObjectThumbnail
            blob={object.imageBlob}
            alt={object.name}
            fit={imageFit}
            className="w-full h-full drop-shadow-md group-hover:scale-[1.02] transition-transform duration-300 pointer-events-none"
          />
        </button>

        {/* Object Name Section */}
        <div className="mt-5 sm:mt-7 text-center flex flex-col items-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-wide uppercase m-0 leading-tight">
            {object.name}
          </h1>

          {/* Second language name */}
          {showSecondLanguage && object.secondLanguageName && (
            <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-extrabold text-rose-500 tracking-wide font-sans">
              {object.secondLanguageName}
            </div>
          )}

          {/* Alternate names tags (informative for caregiver/testing) */}
          {object.alternateNames && object.alternateNames.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {object.alternateNames.map((alt, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold"
                >
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
