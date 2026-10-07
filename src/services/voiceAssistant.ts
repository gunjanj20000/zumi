import type {
  VoiceState,
  MatchResult,
  VoiceAssistantService,
  AppSettings,
  ObjectCard,
} from '../types/types'
import { parseVoiceCommand } from '../utils/commandParser'
import { objectMatcher } from './objectMatcher'
import { speechRecognitionService } from './speechRecognition'
import { ttsService } from './textToSpeech'

export class BrowserVoiceAssistantService implements VoiceAssistantService {
  private state: VoiceState = 'IDLE'
  private stateDetail = ''
  private wakePhrase = 'Hey Zumi'
  private autoSpeak = true
  private alwaysListening = true
  private activeWakeTimeout: any = null
  private resetToListeningTimeout: any = null

  private stateListeners: Set<(state: VoiceState, detail?: string) => void> = new Set()
  private transcriptListeners: Set<(transcript: string, isFinal: boolean) => void> = new Set()
  private commandListeners: Set<(command: string, result: MatchResult) => void> = new Set()
  private errorListeners: Set<(error: string) => void> = new Set()
  private removeSpeechListener: (() => void) | null = null

  constructor() {
    this.setupSpeechListeners()
  }

  public updateConfig(settings: AppSettings): void {
    this.wakePhrase = settings.wakePhrase || 'Hey Zumi'
    this.autoSpeak = settings.autoSpeak
    this.alwaysListening = settings.alwaysListening

    if (settings.recognitionLanguage) {
      speechRecognitionService.setLanguage(settings.recognitionLanguage)
    }

    if (!settings.voiceAssistantEnabled || !settings.alwaysListening) {
      this.stopAlwaysListening()
    }
  }

  private setupSpeechListeners(): void {
    if (this.removeSpeechListener) {
      this.removeSpeechListener()
    }

    this.removeSpeechListener = speechRecognitionService.addListener({
      onStart: () => {
        if (this.state === 'IDLE' || this.state === 'ERROR') {
          this.setState('LISTENING', 'Zumi is listening')
        }
      },
      onEnd: () => {
        // Will auto-restart via speechRecognitionService if active
      },
      onResult: (transcript: string, isFinal: boolean) => {
        this.transcriptListeners.forEach((cb) => cb(transcript, isFinal))
        this.handleTranscript(transcript, isFinal)
      },
      onError: (err: string) => {
        this.setState('ERROR', err)
        this.errorListeners.forEach((cb) => cb(err))
      },
    })
  }

  public getListeningState(): VoiceState {
    return this.state
  }

  public getStateDetail(): string {
    return this.stateDetail
  }

  private setState(state: VoiceState, detail = ''): void {
    this.state = state
    this.stateDetail = detail
    this.stateListeners.forEach((cb) => cb(state, detail))
  }

  public async startAlwaysListening(): Promise<void> {
    if (!speechRecognitionService.isSupported()) {
      this.setState('ERROR', 'Web Speech Recognition is not supported on this browser.')
      return
    }

    this.setState('LISTENING', 'Zumi is listening')
    speechRecognitionService.start()
  }

  public stopAlwaysListening(): void {
    this.clearTimeouts()
    speechRecognitionService.stop()
    this.setState('IDLE', 'Assistant paused')
  }

  public restartListening(): void {
    this.clearTimeouts()
    this.setState('LISTENING', 'Zumi is listening')
    speechRecognitionService.restart()
  }

  public detectWakePhrase(transcript: string): boolean {
    const parsed = parseVoiceCommand(transcript, this.wakePhrase)
    return parsed.hasWakePhrase
  }

  public recognizeObjectName(transcript: string): string {
    const parsed = parseVoiceCommand(transcript, this.wakePhrase)
    return parsed.extractedName
  }

  public matchObject(objectName: string): MatchResult {
    return objectMatcher.matchObject(objectName)
  }

  private clearTimeouts(): void {
    if (this.activeWakeTimeout) {
      clearTimeout(this.activeWakeTimeout)
      this.activeWakeTimeout = null
    }
    if (this.resetToListeningTimeout) {
      clearTimeout(this.resetToListeningTimeout)
      this.resetToListeningTimeout = null
    }
  }

  /**
   * Core voice pipeline handler.
   */
  private handleTranscript(transcript: string, isFinal: boolean): void {
    if (this.state === 'MATCHING' || this.state === 'OBJECT_FOUND') {
      return // Processing current object
    }

    const parsed = parseVoiceCommand(transcript, this.wakePhrase)

    // Scenario A: Currently in LISTENING_FOR_OBJECT state (wake word was previously detected)
    if (this.state === 'LISTENING_FOR_OBJECT') {
      const candidateName = parsed.extractedName || transcript
      if (candidateName && candidateName.length >= 2) {
        this.executeMatch(candidateName)
      }
      return
    }

    // Scenario B: Transcript has wake phrase ("Hey Zumi" or "Hey Zumi, show Apple")
    if (parsed.hasWakePhrase) {
      if (parsed.isWakeOnly || !parsed.extractedName) {
        // Child just said "Hey Zumi"
        this.setState('LISTENING_FOR_OBJECT', 'Listening for object...')

        // Set a 6 second timeout to return to LISTENING if child doesn't say object name
        this.clearTimeouts()
        this.activeWakeTimeout = setTimeout(() => {
          if (this.state === 'LISTENING_FOR_OBJECT') {
            this.setState('LISTENING', 'Zumi is listening')
          }
        }, 6000)
      } else {
        // Child said full command in one phrase: "Hey Zumi, show Apple"
        this.executeMatch(parsed.extractedName)
      }
      return
    }

    // Scenario C: If user is actively typing or child says single object directly when listening
    // We only trigger if it's final or high-confidence match
    if (isFinal && parsed.extractedName && this.state === 'LISTENING') {
      const quickMatch = this.matchObject(parsed.extractedName)
      if (quickMatch.status === 'exact') {
        this.executeMatch(parsed.extractedName)
      }
    }
  }

  /**
   * Executes in-memory matching and triggers immediate object display & speech.
   */
  private async executeMatch(query: string): Promise<void> {
    this.clearTimeouts()
    this.setState('MATCHING', `Finding ${query}...`)

    const result = this.matchObject(query)

    if (result.status === 'exact' || result.status === 'confident') {
      const object = result.object as ObjectCard
      this.setState('OBJECT_FOUND', `Found ${object.name}!`)

      // Immediately notify listeners to display the image!
      this.commandListeners.forEach((cb) => cb(query, result))

      // Speak object name if autoSpeak is enabled
      if (this.autoSpeak && object) {
        try {
          await ttsService.speak(object.name)
        } catch {
          // ignore TTS errors
        }
      }

      // Return smoothly to listening after brief pause
      this.scheduleReturnToListening(2500)
    } else if (result.status === 'ambiguous') {
      // Ambiguous matches -> show "Did you mean?" suggestions
      this.commandListeners.forEach((cb) => cb(query, result))
      this.setState('LISTENING_FOR_OBJECT', `Did you mean ${query}?`)
      this.scheduleReturnToListening(5000)
    } else {
      // No match found
      this.setState('NO_MATCH', `Couldn't find "${query}"`)
      this.commandListeners.forEach((cb) => cb(query, result))

      if (this.autoSpeak) {
        try {
          await ttsService.speak("I couldn't find that object")
        } catch {
          // ignore
        }
      }

      this.scheduleReturnToListening(2000)
    }
  }

  private scheduleReturnToListening(delayMs: number): void {
    this.clearTimeouts()
    this.resetToListeningTimeout = setTimeout(() => {
      if (this.alwaysListening) {
        this.setState('LISTENING', 'Zumi is listening')
      } else {
        this.setState('IDLE', 'Assistant idle')
      }
    }, delayMs)
  }

  public onStateChange(cb: (state: VoiceState, detail?: string) => void): () => void {
    this.stateListeners.add(cb)
    return () => {
      this.stateListeners.delete(cb)
    }
  }

  public onTranscript(cb: (transcript: string, isFinal: boolean) => void): () => void {
    this.transcriptListeners.add(cb)
    return () => {
      this.transcriptListeners.delete(cb)
    }
  }

  public onCommandDetected(cb: (command: string, result: MatchResult) => void): () => void {
    this.commandListeners.add(cb)
    return () => {
      this.commandListeners.delete(cb)
    }
  }

  public onError(cb: (error: string) => void): () => void {
    this.errorListeners.add(cb)
    return () => {
      this.errorListeners.delete(cb)
    }
  }
}

export const voiceAssistantService = new BrowserVoiceAssistantService()
