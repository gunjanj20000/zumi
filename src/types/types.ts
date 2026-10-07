export interface ObjectCard {
  id: string
  name: string
  normalizedName: string
  alternateNames?: string[]
  normalizedAlternateNames?: string[]
  secondLanguageName?: string
  imageBlob: Blob
  mimeType: string
  createdAt: number
  updatedAt: number
}

export type ImageFitMode = 'contain' | 'cover'

export interface AppSettings {
  id?: number
  voiceAssistantEnabled: boolean
  alwaysListening: boolean
  wakePhrase: string
  recognitionLanguage: string
  ttsLanguage: string
  autoSpeak: boolean
  imageFit: ImageFitMode
  showSecondLanguage: boolean
  theme: 'cheerful' | 'sunset' | 'aqua'
}

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'WAKE_DETECTED'
  | 'LISTENING_FOR_OBJECT'
  | 'MATCHING'
  | 'OBJECT_FOUND'
  | 'NO_MATCH'
  | 'ERROR'

export interface MatchResult {
  status: 'exact' | 'confident' | 'ambiguous' | 'none'
  object?: ObjectCard
  candidates?: ObjectCard[]
  score?: number
  matchedQuery?: string
}

export interface VoiceAssistantService {
  startAlwaysListening(): Promise<void>
  stopAlwaysListening(): void
  restartListening(): void
  detectWakePhrase(transcript: string): boolean
  recognizeObjectName(transcript: string): string
  matchObject(objectName: string): MatchResult
  getListeningState(): VoiceState
  getStateDetail(): string
  updateConfig(settings: AppSettings): void
  onStateChange(cb: (state: VoiceState, detail?: string) => void): () => void
  onTranscript(cb: (transcript: string, isFinal: boolean) => void): () => void
  onCommandDetected(cb: (command: string, result: MatchResult) => void): () => void
  onError(cb: (error: string) => void): () => void
}
