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
  voiceAssistantEnabled?: boolean
  onToggleVoiceAssistant?: () => void
}

export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  state,
  stateDetail,
  liveTranscript,
  errorMessage,
  isSupported = true,
  onRestart,
  voiceAssistantEnabled,
  onToggleVoiceAssistant,
}) => {
  if (!isSupported) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm font-semibold border border-amber-200 shadow-sm">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Speech API unavailable (use typed search)</span>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRestart}
          title="Tap to retry microphone"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs sm:text-sm font-medium border border-rose-200 shadow-sm transition-colors cursor-pointer"
        >
          <MicOff className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-xs">{errorMessage}</span>
          <span className="text-xs underline font-bold text-rose-700">Retry</span>
        </button>
        {onToggleVoiceAssistant && (
          <button
            type="button"
            onClick={onToggleVoiceAssistant}
            title="Disable Voice Assistant"
            className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs cursor-pointer transition-colors"
          >
            Turn Off
          </button>
        )}
      </div>
    )
  }

  const isEnabled = voiceAssistantEnabled ?? (state !== 'IDLE')

  // When disabled (or idle), show the Enable Voice Assistant button with switch
  if (!isEnabled || state === 'IDLE') {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onToggleVoiceAssistant}
          title="Enable Voice Assistant"
          aria-label="Enable Voice Assistant"
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border-2 border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 hover:border-emerald-300 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs sm:text-sm group"
        >
          <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
          <span>
            Enable Voice<span className="hidden sm:inline"> Assistant</span>
          </span>
          <span
            className="w-7 h-4 rounded-full bg-slate-200 group-hover:bg-slate-300 flex items-center justify-start p-0.5 transition-colors shrink-0"
            aria-hidden="true"
          >
            <span className="w-3 h-3 bg-white rounded-full shadow-xs"></span>
          </span>
        </button>
      </div>
    )
  }

  // When enabled, render according to voice states and allow toggling to disable
  let dotColor = 'bg-emerald-500'
  let textColor = 'text-emerald-900'
  let bgColor = 'bg-emerald-50/90 border-emerald-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-900'
  let icon = <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
  let label: React.ReactNode = (
    <span>
      Disable Voice<span className="hidden sm:inline"> Assistant</span>
    </span>
  )

  switch (state) {
    case 'LISTENING':
      dotColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
      textColor = 'text-emerald-900'
      bgColor = 'bg-emerald-50/90 border-emerald-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-900'
      icon = <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
      label = (
        <span>
          Disable Voice<span className="hidden sm:inline"> Assistant</span>
        </span>
      )
      break

    case 'WAKE_DETECTED':
    case 'LISTENING_FOR_OBJECT':
      dotColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
      textColor = 'text-amber-900 font-bold'
      bgColor = 'bg-amber-50 border-amber-300'
      icon = <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 animate-gentle-bounce shrink-0" />
      label = <span>Listening for object…</span>
      break

    case 'MATCHING':
      dotColor = 'bg-sky-500'
      textColor = 'text-sky-900 font-semibold'
      bgColor = 'bg-sky-50 border-sky-300'
      icon = <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 animate-spin shrink-0" />
      label = <span>{stateDetail || 'Finding…'}</span>
      break

    case 'OBJECT_FOUND':
      dotColor = 'bg-purple-500'
      textColor = 'text-purple-900 font-bold'
      bgColor = 'bg-purple-50 border-purple-300'
      icon = <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
      label = <span>{stateDetail || '✨ Found!'}</span>
      break

    case 'NO_MATCH':
      dotColor = 'bg-orange-500'
      textColor = 'text-orange-900'
      bgColor = 'bg-orange-50 border-orange-200'
      icon = <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 shrink-0" />
      label = <span>{stateDetail || "Couldn't find object"}</span>
      break
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onToggleVoiceAssistant}
        title="Disable Voice Assistant"
        aria-label="Disable Voice Assistant"
        className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border-2 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs sm:text-sm group ${bgColor}`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {state === 'LISTENING' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          {(state === 'LISTENING_FOR_OBJECT' || state === 'WAKE_DETECTED') && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`}></span>
        </span>

        {icon}

        <span className={`tracking-wide ${textColor}`}>
          {label}
        </span>

        <span
          className="w-7 h-4 rounded-full bg-emerald-500 flex items-center justify-end p-0.5 transition-colors shrink-0"
          aria-hidden="true"
        >
          <span className="w-3 h-3 bg-white rounded-full shadow-xs"></span>
        </span>
      </button>

      {/* Gentle live transcript whisper */}
      {liveTranscript && (state === 'LISTENING_FOR_OBJECT' || state === 'MATCHING') && (
        <p className="text-xs text-slate-500 italic max-w-xs truncate animate-fadeIn">
          "{liveTranscript}"
        </p>
      )}
    </div>
  )
}
