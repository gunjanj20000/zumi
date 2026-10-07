import { useState, useEffect, useCallback } from 'react'
import type { VoiceState, MatchResult, AppSettings } from '../types/types'
import { voiceAssistantService } from '../services/voiceAssistant'
import { speechRecognitionService } from '../services/speechRecognition'

export interface UseVoiceAssistantOptions {
  settings?: AppSettings
  onMatchedObject?: (result: MatchResult) => void
  active?: boolean
}

export function useVoiceAssistant({
  settings,
  onMatchedObject,
  active = true,
}: UseVoiceAssistantOptions = {}) {
  const isSupported = speechRecognitionService.isSupported()
  const [state, setState] = useState<VoiceState>(voiceAssistantService.getListeningState())
  const [stateDetail, setStateDetail] = useState<string>(voiceAssistantService.getStateDetail())
  const [liveTranscript, setLiveTranscript] = useState<string>('')
  const [error, setError] = useState<string | null>(
    !isSupported ? 'Web Speech API is not supported on this browser.' : null
  )

  // Update voice assistant config whenever settings change
  useEffect(() => {
    if (settings) {
      voiceAssistantService.updateConfig(settings)
    }
  }, [settings])

  // Subscribe to service events
  useEffect(() => {
    const unsubState = voiceAssistantService.onStateChange((newState, detail) => {
      setState(newState)
      if (detail) setStateDetail(detail)
      if (newState !== 'ERROR') setError(null)
    })

    const unsubTranscript = voiceAssistantService.onTranscript((transcript) => {
      setLiveTranscript(transcript)
    })

    const unsubCommand = voiceAssistantService.onCommandDetected((_cmd, result) => {
      if (onMatchedObject) {
        onMatchedObject(result)
      }
    })

    const unsubError = voiceAssistantService.onError((err) => {
      setError(err)
      setState('ERROR')
    })

    return () => {
      unsubState()
      unsubTranscript()
      unsubCommand()
      unsubError()
    }
  }, [onMatchedObject])

  // Manage always-listening lifecycle
  useEffect(() => {
    if (!isSupported) {
      return
    }

    if (active && settings?.voiceAssistantEnabled && settings?.alwaysListening) {
      voiceAssistantService.startAlwaysListening()
    } else {
      voiceAssistantService.stopAlwaysListening()
    }

    return () => {
      // Don't kill abruptly on quick re-renders, but stop if component unmounts
      if (!active) {
        voiceAssistantService.stopAlwaysListening()
      }
    }
  }, [active, settings?.voiceAssistantEnabled, settings?.alwaysListening, isSupported])

  const startListening = useCallback(() => {
    setError(null)
    voiceAssistantService.startAlwaysListening()
  }, [])

  const stopListening = useCallback(() => {
    voiceAssistantService.stopAlwaysListening()
  }, [])

  const restartListening = useCallback(() => {
    setError(null)
    voiceAssistantService.restartListening()
  }, [])

  return {
    state,
    stateDetail,
    liveTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    restartListening,
  }
}
