# OBJECT SPEAKER — ZUMI 🧸🎙️

> **Production-ready, offline-first Progressive Web App (PWA) designed for children, powered by the voice assistant ZUMI.**

---

## 🌟 Overview & Core Experience

**Object Speaker** is a child-friendly, offline-first voice and visual assistant. A parent or caregiver creates a local library of familiar objects (e.g. *Apple*, *Bhujia*, *Chocolate*, *Ball*, *Milk*) with custom photos, alternate names/pronunciations, and second-language titles.

The child can find any object in two ways:
1. **Always-Listening Voice Assistant**:
   - Child says: **“Hey Zumi, show Apple”** (or simply *“Hey Zumi, Apple”*, *“Hey Zumi, show me Bhujia”*)
   - Zumi detects the wake phrase, strips command prefixes, matches the object in memory in milliseconds, **immediately renders the large full-screen card**, and **speaks the object name** aloud before smoothly returning to listening mode.
2. **Instant Typed Search**:
   - A large, colorful search box with sub-millisecond prefix & substring matching and autocomplete suggestions.

---

## 🚀 Key Features

- **Hands-Free Always-Listening Mode**: No microphone button pressing needed. Zumi listens continuously while the app is active.
- **Instant In-Memory Matching**: Loads all object metadata into memory at startup (`normalizedName → object`), supporting exact matching, normalized matching, alternate pronunciations, and conservative fuzzy matching.
- **Child-Friendly Visuals**: Warm, cheerful gradients (Coral Rainbow, Sunset Glow, Aqua Sky), large typography, gentle celebratory confetti, and high-contrast touch targets.
- **Caregiver Control Center**:
  - Add & edit objects with direct camera capture, file upload, or photo library selection.
  - Automatic client-side image resizing and compression (max 1024×1024 WebP/JPEG) stored securely as native `Blob`s in IndexedDB.
  - Tag multiple alternate names (e.g. *“bhujiya”*, *“namkeen”*, *“sev”*) for child speech variations.
  - Optional second-language names (e.g. Hindi *“सेब”*, *“भुजिया”*).
  - Search and delete items with confirmation dialogs.
  - Optional one-click **Starter Pack** loader (*Apple*, *Bhujia*, *Chocolate*, *Ball*, *Milk*).
- **100% Offline-First Architecture**: Powered by Dexie.js (IndexedDB) and `vite-plugin-pwa`. No Firebase, Supabase, or external backend required. All voice processing and images remain local on device.
- **Native Extensibility**: Built with a clean `VoiceAssistantService` abstraction layer ready for Capacitor Native Android and iOS packaging.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS v4
- **Routing**: React Router (HashRouter for rock-solid offline and Capacitor compatibility)
- **Local Database**: Dexie.js + IndexedDB (native Blob storage)
- **PWA**: `vite-plugin-pwa` (Service Worker cache + Web App Manifest)
- **Voice Recognition**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`)
- **Speech Synthesis**: Web SpeechSynthesis API (`speechSynthesis`)
- **Icons**: Lucide React + custom vector PWA icons

---

## 📦 Getting Started

### 1. Installation

```bash
git clone <repository-url>
cd zumi
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser (preferably Google Chrome or Edge for full Web Speech API support).

### 3. Run Automated Tests

```bash
npm test
```

Executes test suites covering text normalization, Unicode Indic diacritics, command parsing, wake phrase stripping, and in-memory object matching.

### 4. Build for Production

```bash
npm run build
```

Generates optimized assets and Service Worker in `dist/`.

To preview the production build locally:

```bash
npm run preview
```

---

## 📱 PWA Installation

### Android (Google Chrome / Brave / Edge)
1. Open the deployed application URL in Chrome.
2. Tap the three-dot menu (**⋮**) or the install prompt at the bottom of the screen.
3. Select **"Add to Home screen"** or **"Install app"**.
4. Launch "Object Speaker" directly from your home screen in full-screen standalone mode.

### iOS (Apple Safari)
1. Open the application in Safari.
2. Tap the **Share** button (box with an upward arrow at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top-right corner.

---

## 🎙️ Voice Architecture & Real-World Limitations

### Architecture: `VoiceAssistantService`

The application decouples voice processing from UI components via the `VoiceAssistantService` interface:

```typescript
export interface VoiceAssistantService {
  startAlwaysListening(): Promise<void>
  stopAlwaysListening(): void
  restartListening(): void
  detectWakePhrase(transcript: string): boolean
  recognizeObjectName(transcript: string): string
  matchObject(objectName: string): MatchResult
  getListeningState(): VoiceState
  onStateChange(cb: (state: VoiceState, detail?: string) => void): () => void
  onTranscript(cb: (transcript: string, isFinal: boolean) => void): () => void
  onCommandDetected(cb: (command: string, result: MatchResult) => void): () => void
  onError(cb: (error: string) => void): () => void
}
```

The current implementation is `BrowserVoiceAssistantService`.

### Lifecycle States

```text
[LISTENING]  (🟢 Zumi is listening)
    │
    ▼ (Hear: "Hey Zumi, show Apple")
[MATCHING]   (🔵 Finding Apple...)
    │
    ▼
[OBJECT_FOUND] (✨ Apple!)
    ├── Display image immediately
    └── Speak name via SpeechSynthesis
    │
    ▼ (After ~2.5s)
[LISTENING]  (🟢 Zumi is listening)
```

If the child speaks just the wake phrase (*"Hey Zumi"*), the assistant transitions to `LISTENING_FOR_OBJECT` with a 6-second window awaiting the object name.

### Browser & OS Limitations (PWA)

- **Active Web Page Only**: Standard browser security models suspend JavaScript execution and disable microphone capture when the screen is locked, when the browser tab is backgrounded, or when iOS suspends the app.
- **Speech Recognition Support**: Web Speech API is natively supported in Chromium browsers (Chrome, Edge, Samsung Internet). Safari on iOS has partial support. If speech recognition is unavailable, the UI gracefully presents a clear notification and allows touch/typed search without crashing.

---

## 📲 Future Capacitor Native Conversion (Screen-Off & Lock-Screen)

The architecture is specifically structured so that the app can be converted into a native Android APK and iOS app using **Capacitor**:

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   npx cap init "Object Speaker" "com.zumi.objectspeaker" --web-dir dist
   ```
2. Implement Native Voice Services:
   - Create `NativeAndroidVoiceAssistantService` using Android's `SpeechRecognizer` foreground service or `Porcupine` wake-word engine.
   - Create `NativeIOSVoiceAssistantService` using iOS `SFSpeechRecognizer` with background audio entitlements.
3. Plug the native service directly into `VoiceAssistantService` without modifying UI components, Dexie storage, or routing!

---

## 🗄️ Database Schema (IndexedDB)

The app uses **Dexie.js** for client-side storage:

### `ObjectCard`
```typescript
interface ObjectCard {
  id: string
  name: string
  normalizedName: string
  alternateNames?: string[]
  normalizedAlternateNames?: string[]
  secondLanguageName?: string
  imageBlob: Blob      // Stored as binary Blob, NOT base64
  mimeType: string     // image/webp or image/jpeg
  createdAt: number
  updatedAt: number
}
```

### `AppSettings`
```typescript
interface AppSettings {
  id?: number
  voiceAssistantEnabled: boolean
  alwaysListening: boolean
  wakePhrase: string
  recognitionLanguage: string
  ttsLanguage: string
  autoSpeak: boolean
  imageFit: 'contain' | 'cover'
  showSecondLanguage: boolean
  theme: 'cheerful' | 'sunset' | 'aqua'
}
```

---

## 🔒 Privacy & Safety

- **100% Local Storage**: Object photos and recordings remain on the user's device in IndexedDB.
- **No Cloud Database**: No Firebase, Supabase, or external backend connections.
- **No Audio Recording Storage**: Voice audio is processed in real time by the Speech API and discarded immediately. No audio files are ever saved or uploaded.
