import { useState, useCallback, useEffect } from 'react'
import { ttsService } from '../services/textToSpeech'

export function useTextToSpeech(defaultLang = 'en-US') {
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Poll state or trigger changes
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(ttsService.getSpeakingState())
    }, 150)
    return () => clearInterval(interval)
  }, [])

  const speak = useCallback(
    async (text: string, lang = defaultLang) => {
      setIsSpeaking(true)
      try {
        await ttsService.speak(text, lang)
      } finally {
        setIsSpeaking(false)
      }
    },
    [defaultLang]
  )

  const stop = useCallback(() => {
    ttsService.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    speak,
    stop,
    isSpeaking,
  }
}
