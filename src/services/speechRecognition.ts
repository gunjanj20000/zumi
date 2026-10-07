/**
 * Web Speech API SpeechRecognition wrapper with continuous listening & auto-restart.
 */

// Define SpeechRecognition types for browsers
type SpeechRecognitionType = any

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionType
    webkitSpeechRecognition?: SpeechRecognitionType
  }
}

export interface SpeechRecognitionListener {
  onResult: (transcript: string, isFinal: boolean) => void
  onError: (error: string) => void
  onStart: () => void
  onEnd: () => void
}

export class BrowserSpeechRecognitionService {
  private recognition: any = null
  private isListening = false
  private shouldKeepListening = false
  private language = 'en-US'
  private listeners: Set<SpeechRecognitionListener> = new Set()
  private restartTimeout: any = null
  private permissionDenied = false

  constructor() {
    this.initRecognition()
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  private initRecognition(): void {
    if (!this.isSupported()) return

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    try {
      this.recognition = new SpeechRecognitionClass()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = this.language
      this.recognition.maxAlternatives = 3

      this.recognition.onstart = () => {
        this.isListening = true
        this.permissionDenied = false
        this.listeners.forEach((l) => l.onStart())
      }

      this.recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          const transcript = item[0]?.transcript || ''

          if (item.isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        const activeTranscript = finalTranscript || interimTranscript
        if (activeTranscript.trim()) {
          const isFinal = Boolean(finalTranscript.trim())
          this.listeners.forEach((l) => l.onResult(activeTranscript.trim(), isFinal))
        }
      }

      this.recognition.onerror = (event: any) => {
        const error = event.error
        // Ignore normal no-speech or aborted events
        if (error === 'no-speech') {
          return
        }

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          this.permissionDenied = true
          this.shouldKeepListening = false
          this.listeners.forEach((l) =>
            l.onError('Microphone permission is needed for voice assistant.')
          )
          return
        }

        if (error === 'network') {
          this.listeners.forEach((l) =>
            l.onError('Speech network connection issue. Reconnecting...')
          )
        }
      }

      this.recognition.onend = () => {
        this.isListening = false
        this.listeners.forEach((l) => l.onEnd())

        // Auto-restart if we should keep listening and permission wasn't denied
        if (this.shouldKeepListening && !this.permissionDenied) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout)
          this.restartTimeout = setTimeout(() => {
            this.safeStart()
          }, 350)
        }
      }
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err)
    }
  }

  public setLanguage(lang: string): void {
    this.language = lang
    if (this.recognition) {
      this.recognition.lang = lang
      // If currently listening, restart to apply new language
      if (this.isListening) {
        this.recognition.stop()
      }
    }
  }

  public addListener(listener: SpeechRecognitionListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public start(): void {
    this.shouldKeepListening = true
    this.permissionDenied = false
    this.safeStart()
  }

  private safeStart(): void {
    if (!this.recognition) {
      this.initRecognition()
    }
    if (!this.recognition || this.isListening) return

    try {
      this.recognition.start()
    } catch (err: any) {
      // If already started, ignore InvalidStateError
      if (err.name !== 'InvalidStateError') {
        console.warn('SpeechRecognition start warning:', err)
      }
    }
  }

  public stop(): void {
    this.shouldKeepListening = false
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch {
        // ignore
      }
    }
    this.isListening = false
  }

  public restart(): void {
    this.stop()
    setTimeout(() => {
      this.start()
    }, 200)
  }

  public getIsListening(): boolean {
    return this.isListening
  }

  public isPermissionDenied(): boolean {
    return this.permissionDenied
  }
}

export const speechRecognitionService = new BrowserSpeechRecognitionService()
