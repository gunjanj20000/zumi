/**
 * Web Speech API SpeechRecognition wrapper with continuous listening,
 * auto-restart, and watchdog timer recovery.
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
  private watchdogInterval: any = null
  private permissionDenied = false

  constructor() {
    this.createRecognitionInstance()
    this.startWatchdog()
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  private createRecognitionInstance(): void {
    if (!this.isSupported()) return

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition

    // If an existing instance exists, try to abort/detach it
    if (this.recognition) {
      try {
        this.recognition.onstart = null
        this.recognition.onresult = null
        this.recognition.onerror = null
        this.recognition.onend = null
        this.recognition.abort()
      } catch {
        // ignore
      }
      this.recognition = null
    }

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

        // 'no-speech' is normal silence; ignore
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

        if (error === 'aborted') {
          // Normal when restarting or stopping
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
          }, 300)
        }
      }
    } catch (err) {
      console.error('Failed to create SpeechRecognition instance:', err)
    }
  }

  private startWatchdog(): void {
    if (typeof window === 'undefined') return

    // Watchdog check every 1.5 seconds: ensures the assistant never dies silently
    this.watchdogInterval = setInterval(() => {
      if (this.shouldKeepListening && !this.isListening && !this.permissionDenied) {
        this.safeStart()
      }
    }, 1500)
  }

  public setLanguage(lang: string): void {
    this.language = lang
    if (this.recognition) {
      this.recognition.lang = lang
      if (this.isListening) {
        this.restart()
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

  public safeStart(): void {
    if (!this.recognition) {
      this.createRecognitionInstance()
    }
    if (!this.recognition || this.isListening) return

    try {
      this.recognition.start()
    } catch (err: any) {
      // If already started or transitioning, retry shortly
      if (err.name === 'InvalidStateError') {
        if (this.restartTimeout) clearTimeout(this.restartTimeout)
        this.restartTimeout = setTimeout(() => {
          if (this.shouldKeepListening && !this.isListening) {
            this.createRecognitionInstance()
            try {
              this.recognition?.start()
            } catch {
              // ignore
            }
          }
        }, 350)
      } else {
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
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
      this.watchdogInterval = null
    }
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        // ignore
      }
    }
    this.isListening = false
  }

  /**
   * Performs a clean restart by aborting current session and starting fresh.
   */
  public restart(): void {
    if (!this.shouldKeepListening) return
    this.isListening = false
    if (this.restartTimeout) clearTimeout(this.restartTimeout)

    try {
      this.recognition?.abort()
    } catch {
      // ignore
    }

    this.restartTimeout = setTimeout(() => {
      this.createRecognitionInstance()
      this.safeStart()
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
