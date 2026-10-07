import React from 'react'
import type { VoiceState } from '../types/types'
import { Mic, MicOff, Sparkles, Loader2, AlertCircle, Volume2 } from 'lucide-react'

interface VoiceStatusProps {
  state: VoiceState
  stateDetail?: string
  liveTranscript?: string
  errorMessage?: string | null
  isSupported?: boolean
  onRestart?: () => void
}

export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  state,
  stateDetail,
  liveTranscript,
  errorMessage,
  isSupported = true,
  onRestart,
}) => {
  if (!isSupported) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm font-semibold border border-amber-200 shadow-sm">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span>Speech API unavailable (use typed search)</span>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <button
        onClick={onRestart}
        title="Tap to retry microphone"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs sm:text-sm font-medium border border-rose-200 shadow-sm transition-colors cursor-pointer"
      >
        <MicOff className="w-4 h-4 text-rose-600" />
        <span className="truncate max-w-[200px] sm:max-w-xs">{errorMessage}</span>
        <span className="text-xs underline font-bold text-rose-700">Retry</span>
      </button>
    )
  }

  // Render according to voice states
  let dotColor = 'bg-emerald-500'
  let textColor = 'text-emerald-800'
  let bgColor = 'bg-emerald-50/90 border-emerald-200'
  let icon = <Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
  let label = 'Zumi is listening'

  switch (state) {
    case 'LISTENING':
      dotColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
      textColor = 'text-emerald-800'
      bgColor = 'bg-emerald-50 border-emerald-200'
      icon = <Mic className="w-3.5 h-3.5 text-emerald-600" />
      label = 'Zumi is listening'
      break

    case 'WAKE_DETECTED':
    case 'LISTENING_FOR_OBJECT':
      dotColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
      textColor = 'text-amber-900 font-bold'
      bgColor = 'bg-amber-50 border-amber-300'
      icon = <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-gentle-bounce" />
      label = 'Listening for object…'
      break

    case 'MATCHING':
      dotColor = 'bg-sky-500'
      textColor = 'text-sky-900 font-semibold'
      bgColor = 'bg-sky-50 border-sky-300'
      icon = <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
      label = stateDetail || 'Finding…'
      break

    case 'OBJECT_FOUND':
      dotColor = 'bg-purple-500'
      textColor = 'text-purple-900 font-bold'
      bgColor = 'bg-purple-50 border-purple-300'
      icon = <Sparkles className="w-3.5 h-3.5 text-purple-600" />
      label = stateDetail || '✨ Found!'
      break

    case 'NO_MATCH':
      dotColor = 'bg-orange-500'
      textColor = 'text-orange-900'
      bgColor = 'bg-orange-50 border-orange-200'
      icon = <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
      label = stateDetail || "Couldn't find object"
      break

    case 'IDLE':
    default:
      dotColor = 'bg-slate-400'
      textColor = 'text-slate-600'
      bgColor = 'bg-slate-100 border-slate-200'
      icon = <MicOff className="w-3.5 h-3.5 text-slate-500" />
      label = 'Zumi is paused'
      break
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border shadow-sm transition-all duration-300 ${bgColor}`}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2.5 w-2.5">
          {state === 'LISTENING' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          {(state === 'LISTENING_FOR_OBJECT' || state === 'WAKE_DETECTED') && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`}></span>
        </span>

        {icon}

        <span className={`text-xs sm:text-sm font-semibold tracking-wide ${textColor}`}>
          {label}
        </span>
      </div>

      {/* Gentle live transcript whisper */}
      {liveTranscript && (state === 'LISTENING_FOR_OBJECT' || state === 'MATCHING') && (
        <p className="text-xs text-slate-500 italic max-w-xs truncate animate-fadeIn">
          "{liveTranscript}"
        </p>
      )}
    </div>
  )
}
