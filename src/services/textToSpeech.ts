/**
 * SpeechSynthesis Text-to-Speech service with Chromium garbage collection protection,
 * fallback safety timeouts, and locale voice selection.
 */

export class TextToSpeechService {
  private isSpeaking = false
  private voices: SpeechSynthesisVoice[] = []
  private voicesLoaded = false
  // Retain active utterance reference to prevent V8 garbage-collecting it mid-speech
  private activeUtterance: SpeechSynthesisUtterance | null = null

  constructor() {
    this.initVoices()
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const load = () => {
      this.voices = window.speechSynthesis.getVoices()
      this.voicesLoaded = true
    }

    load()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load
    }
  }

  /**
   * Returns available speech voices.
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.voicesLoaded && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices()
    }
    return this.voices
  }

  /**
   * Finds the best matching voice for a given language code (e.g. 'en-US', 'en-IN', 'hi-IN').
   */
  private findVoice(langCode: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices()
    if (voices.length === 0) return null

    // Exact match (e.g. 'en-US' or 'hi-IN')
    const exact = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase())
    if (exact) return exact

    // Partial prefix match (e.g. 'en')
    const prefix = langCode.split('-')[0].toLowerCase()
    const partial = voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
    if (partial) return partial

    return voices[0] || null
  }

  /**
   * Cancels any currently playing speech.
   */
  public cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
    this.activeUtterance = null
    this.isSpeaking = false
  }

  /**
   * Speaks the given text cleanly with garbage collection protection & safety timeout.
   */
  public async speak(text: string, lang = 'en-US'): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve()
    }

    if (!text || !text.trim()) return Promise.resolve()

    // Cancel previous speech immediately
    this.cancel()

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text.trim())
      this.activeUtterance = utterance
      utterance.lang = lang
      utterance.rate = 0.95 // Slightly gentle rate for children
      utterance.pitch = 1.05 // Friendly, warm pitch

      const voice = this.findVoice(lang)
      if (voice) {
        utterance.voice = voice
      }

      let finished = false
      let safetyTimer: any = null

      const cleanup = () => {
        if (finished) return
        finished = true
        if (safetyTimer) clearTimeout(safetyTimer)
        this.isSpeaking = false
        this.activeUtterance = null
        resolve()
      }

      // Safety timeout: If browser speech synthesis hangs or fails to fire onend,
      // force release after 3 seconds so the assistant is never stuck!
      safetyTimer = setTimeout(() => {
        cleanup()
      }, 3000)

      utterance.onstart = () => {
        this.isSpeaking = true
      }

      utterance.onend = () => {
        cleanup()
      }

      utterance.onerror = () => {
        cleanup()
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        window.speechSynthesis.speak(utterance)
      } catch {
        cleanup()
      }
    })
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking
  }

  public getActiveUtterance(): SpeechSynthesisUtterance | null {
    return this.activeUtterance
  }
}

export const ttsService = new TextToSpeechService()
