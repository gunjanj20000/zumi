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
    } else if (this.state === 'IDLE') {
      this.startAlwaysListening()
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
        // Handled via speechRecognitionService auto-restart & watchdog
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
    // If currently matching in-memory, allow it to complete (< 5ms)
    if (this.state === 'MATCHING') {
      return
    }

    const parsed = parseVoiceCommand(transcript, this.wakePhrase)

    // Scenario A: If user speaks a new command with wake phrase (even during OBJECT_FOUND),
    // immediately honor the new command so consecutive commands are instant!
    if (parsed.hasWakePhrase) {
      if (parsed.isWakeOnly || !parsed.extractedName) {
        // Child said "Hey Zumi"
        this.clearTimeouts()
        ttsService.cancel()
        this.setState('LISTENING_FOR_OBJECT', 'Listening for object...')

        this.activeWakeTimeout = setTimeout(() => {
          if (this.state === 'LISTENING_FOR_OBJECT') {
            this.setState('LISTENING', 'Zumi is listening')
          }
        }, 6000)
      } else {
        // Child said full command: "Hey Zumi, show Apple"
        this.clearTimeouts()
        ttsService.cancel()
        this.executeMatch(parsed.extractedName)
      }
      return
    }

    // Scenario B: Currently in LISTENING_FOR_OBJECT state (wake word was previously detected)
    if (this.state === 'LISTENING_FOR_OBJECT') {
      const candidateName = parsed.extractedName || transcript
      if (candidateName && candidateName.length >= 2) {
        this.executeMatch(candidateName)
      }
      return
    }

    // Scenario C: If single object name is spoken directly with high-confidence match
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
  private executeMatch(query: string): void {
    this.clearTimeouts()
    this.setState('MATCHING', `Finding ${query}...`)

    const result = this.matchObject(query)

    if (result.status === 'exact' || result.status === 'confident') {
      const object = result.object as ObjectCard
      this.setState('OBJECT_FOUND', `Found ${object.name}!`)

      // Immediately notify listeners to display the image!
      this.commandListeners.forEach((cb) => cb(query, result))

      // Speak object name non-blockingly with autoSpeak
      if (this.autoSpeak && object) {
        ttsService.speak(object.name).catch(() => {})
      }

      // Return smoothly to listening and restart recognition for consecutive commands
      this.scheduleReturnToListening(1200)
    } else if (result.status === 'ambiguous') {
      // Ambiguous matches -> show "Did you mean?" suggestions
      this.commandListeners.forEach((cb) => cb(query, result))
      this.setState('LISTENING_FOR_OBJECT', `Did you mean ${query}?`)
      this.scheduleReturnToListening(4000)
    } else {
      // No match found
      this.setState('NO_MATCH', `Couldn't find "${query}"`)
      this.commandListeners.forEach((cb) => cb(query, result))

      if (this.autoSpeak) {
        ttsService.speak("I couldn't find that object").catch(() => {})
      }

      this.scheduleReturnToListening(1500)
    }
  }

  private scheduleReturnToListening(delayMs: number): void {
    this.clearTimeouts()
    this.resetToListeningTimeout = setTimeout(() => {
      if (this.alwaysListening) {
        this.setState('LISTENING', 'Zumi is listening')
        // Clean session restart guarantees subsequent speech recognition commands respond cleanly
        speechRecognitionService.restart()
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
