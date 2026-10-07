/**
 * SpeechSynthesis Text-to-Speech service.
 */

export class TextToSpeechService {
  private isSpeaking = false
  private voices: SpeechSynthesisVoice[] = []
  private voicesLoaded = false

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
      window.speechSynthesis.cancel()
    }
    this.isSpeaking = false
  }

  /**
   * Speaks the given text cleanly without overlaps.
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
      utterance.lang = lang
      utterance.rate = 0.95 // Slightly gentle rate for children
      utterance.pitch = 1.05 // Friendly, warm pitch

      const voice = this.findVoice(lang)
      if (voice) {
        utterance.voice = voice
      }

      utterance.onstart = () => {
        this.isSpeaking = true
      }

      utterance.onend = () => {
        this.isSpeaking = false
        resolve()
      }

      utterance.onerror = () => {
        // 'interrupted' or 'canceled' are expected when user changes selection quickly
        this.isSpeaking = false
        resolve()
      }

      // Resume speech synthesis in case mobile browser paused it
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking
  }
}

export const ttsService = new TextToSpeechService()
