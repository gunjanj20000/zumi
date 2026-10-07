import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type {
  VoiceState,
  MatchResult,
  VoiceAssistantService,
  AppSettings,
  ObjectCard,
} from '../types/types'
import { parseVoiceCommand } from '../utils/commandParser'
import { objectMatcher } from './objectMatcher'
import { ttsService } from './textToSpeech'

export interface NativeVoiceAssistantPlugin {
  startListening(): Promise<{ success: boolean }>
  stopListening(): Promise<{ success: boolean }>
  restartListening(): Promise<{ success: boolean }>
  updateConfig(options: { wakePhrase?: string; language?: string }): Promise<{ success: boolean }>
  getListeningState(): Promise<{ state: string }>
  addListener(
    eventName: 'stateChange',
    listenerFunc: (data: { state: VoiceState; detail: string }) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'wakeWordDetected',
    listenerFunc: (data: { phrase: string; subsequentText: string }) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'transcript',
    listenerFunc: (data: { transcript: string; isFinal: boolean }) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'commandDetected',
    listenerFunc: (data: { command: string }) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'error',
    listenerFunc: (data: { error: string }) => void
  ): Promise<PluginListenerHandle>
}

const NativeVoiceAssistant = registerPlugin<NativeVoiceAssistantPlugin>('VoiceAssistant')

/**
 * Native Android VoiceAssistantService.
 * Replaces browser SpeechRecognition with native Android SpeechRecognizer
 * and on-device WakeWordEngine for "Hey Zumi".
 * Phase 5: Keeps all object matching 100% local on-device.
 */
export class NativeAndroidVoiceAssistantService implements VoiceAssistantService {
  private state: VoiceState = 'IDLE'
  private stateDetail = ''
  private wakePhrase = 'Hey Zumi'
  private autoSpeak = true
  private alwaysListening = true
  private resetToListeningTimeout: any = null

  private stateListeners: Set<(state: VoiceState, detail?: string) => void> = new Set()
  private transcriptListeners: Set<(transcript: string, isFinal: boolean) => void> = new Set()
  private commandListeners: Set<(command: string, result: MatchResult) => void> = new Set()
  private errorListeners: Set<(error: string) => void> = new Set()
  private listenerHandles: PluginListenerHandle[] = []

  constructor() {
    this.setupNativeListeners()
  }

  private async setupNativeListeners(): Promise<void> {
    try {
      const h1 = await NativeVoiceAssistant.addListener('stateChange', (data) => {
        this.setState(data.state, data.detail)
      })
      this.listenerHandles.push(h1)

      const h2 = await NativeVoiceAssistant.addListener('wakeWordDetected', (data) => {
        if (data.subsequentText && data.subsequentText.trim()) {
          this.executeMatch(data.subsequentText.trim())
        } else {
          this.setState('LISTENING_FOR_OBJECT', `Listening for object...`)
        }
      })
      this.listenerHandles.push(h2)

      const h3 = await NativeVoiceAssistant.addListener('transcript', (data) => {
        this.transcriptListeners.forEach((cb) => cb(data.transcript, data.isFinal))
      })
      this.listenerHandles.push(h3)

      const h4 = await NativeVoiceAssistant.addListener('commandDetected', (data) => {
        if (data.command && data.command.trim()) {
          this.executeMatch(data.command.trim())
        }
      })
      this.listenerHandles.push(h4)

      const h5 = await NativeVoiceAssistant.addListener('error', (data) => {
        this.setState('ERROR', data.error)
        this.errorListeners.forEach((cb) => cb(data.error))
      })
      this.listenerHandles.push(h5)
    } catch (err) {
      console.warn('NativeVoiceAssistant listener setup error (may be running in non-native environment):', err)
    }
  }

  public updateConfig(settings: AppSettings): void {
    this.wakePhrase = settings.wakePhrase || 'Hey Zumi'
    this.autoSpeak = settings.autoSpeak
    this.alwaysListening = settings.alwaysListening

    NativeVoiceAssistant.updateConfig({
      wakePhrase: this.wakePhrase,
      language: settings.recognitionLanguage || 'en-US',
    }).catch(() => {})

    if (!settings.voiceAssistantEnabled || !settings.alwaysListening) {
      this.stopAlwaysListening()
    } else if (this.state === 'IDLE') {
      this.startAlwaysListening()
    }
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
    try {
      this.setState('LISTENING', 'Zumi is listening for "Hey Zumi"')
      await NativeVoiceAssistant.startListening()
    } catch (err: any) {
      this.setState('ERROR', err?.message || 'Could not start Android Voice Assistant')
      this.errorListeners.forEach((cb) => cb(err?.message || 'Start failed'))
    }
  }

  public stopAlwaysListening(): void {
    this.clearTimeouts()
    NativeVoiceAssistant.stopListening().catch(() => {})
    this.setState('IDLE', 'Assistant paused')
  }

  public restartListening(): void {
    this.clearTimeouts()
    this.setState('LISTENING', 'Zumi is listening for "Hey Zumi"')
    NativeVoiceAssistant.restartListening().catch(() => {})
  }

  public detectWakePhrase(transcript: string): boolean {
    const parsed = parseVoiceCommand(transcript, this.wakePhrase)
    return parsed.hasWakePhrase
  }

  public recognizeObjectName(transcript: string): string {
    const parsed = parseVoiceCommand(transcript, this.wakePhrase)
    return parsed.extractedName
  }

  /**
   * Phase 5: Keep object matching completely local on device.
   * Matches query against local in-memory index loaded from Dexie DB.
   */
  public matchObject(objectName: string): MatchResult {
    return objectMatcher.matchObject(objectName)
  }

  private clearTimeouts(): void {
    if (this.resetToListeningTimeout) {
      clearTimeout(this.resetToListeningTimeout)
      this.resetToListeningTimeout = null
    }
  }

  /**
   * Phase 5: Pure local on-device object matching.
   */
  private executeMatch(query: string): void {
    this.clearTimeouts()
    this.setState('MATCHING', `Finding ${query}...`)

    // Extract object name if voice prefix like "show", "find", etc. was included
    const parsed = parseVoiceCommand(query, this.wakePhrase)
    const effectiveQuery = parsed.extractedName || query

    // Perform 100% on-device local matching
    const result = this.matchObject(effectiveQuery)

    if (result.status === 'exact' || result.status === 'confident') {
      const object = result.object as ObjectCard
      this.setState('OBJECT_FOUND', `Found ${object.name}!`)

      // Immediately notify listeners to display the image!
      this.commandListeners.forEach((cb) => cb(effectiveQuery, result))

      // Speak object name locally with autoSpeak
      if (this.autoSpeak && object) {
        ttsService.speak(object.name).catch(() => {})
      }

      this.scheduleReturnToListening(1200)
    } else if (result.status === 'ambiguous') {
      this.commandListeners.forEach((cb) => cb(effectiveQuery, result))
      this.setState('LISTENING_FOR_OBJECT', `Did you mean ${effectiveQuery}?`)
      this.scheduleReturnToListening(4000)
    } else {
      this.setState('NO_MATCH', `Couldn't find "${effectiveQuery}"`)
      this.commandListeners.forEach((cb) => cb(effectiveQuery, result))

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
        this.setState('LISTENING', 'Zumi is listening for "Hey Zumi"')
        NativeVoiceAssistant.restartListening().catch(() => {})
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
