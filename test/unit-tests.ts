import assert from 'node:assert/strict'
import { normalizeText, levenshteinDistance, calculateSimilarity } from '../src/utils/normalization.ts'
import { parseVoiceCommand } from '../src/utils/commandParser.ts'
import { ObjectMatcher } from '../src/services/objectMatcher.ts'
import { blobToBase64, dataUrlToBlob } from '../src/services/backup.ts'
import { parseAnyWordPack } from '../src/services/universalWordPack.ts'

console.log('--- Running Object Speaker / Zumi Unit Tests ---')

// 1. Test Normalization
console.log('Testing normalization...')
assert.equal(normalizeText('  Apple!  '), 'apple')
assert.equal(normalizeText('Red   Ball?'), 'red ball')
assert.equal(normalizeText('Bhujia / Bhujiya'), 'bhujia bhujiya')
assert.equal(normalizeText('सेब!'), 'सेब')
console.log('✔ Normalization tests passed')

// 2. Test Levenshtein & Similarity
console.log('Testing Levenshtein distance & similarity...')
assert.equal(levenshteinDistance('apple', 'apple'), 0)
assert.equal(levenshteinDistance('bhujia', 'bhujiya'), 1)
assert.ok(calculateSimilarity('bhujia', 'bhujiya') > 0.8)
assert.ok(calculateSimilarity('apple', 'banana') < 0.3)
console.log('✔ Levenshtein tests passed')

// 3. Test Command Parser
console.log('Testing command parser against specification...')

// "Hey Zumi, show Apple"
let p = parseVoiceCommand('Hey Zumi, show Apple')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'apple')

// "Hey Zumi, please show me the apple."
p = parseVoiceCommand('Hey Zumi, please show me the apple.')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'apple')

// "Hey Zumi, I want chocolate."
p = parseVoiceCommand('Hey Zumi, I want chocolate.')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'chocolate')

// "Hey Zumi, find my bhujia."
p = parseVoiceCommand('Hey Zumi, find my bhujia.')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'bhujia')

// "Hey Zumi, show me the red ball."
p = parseVoiceCommand('Hey Zumi, show me the red ball.')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'red ball')

// "Hey Zumi" (wake only)
p = parseVoiceCommand('Hey Zumi')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.isWakeOnly, true)
assert.equal(p.extractedName, '')

// "Zumi" (wake only)
p = parseVoiceCommand('Zumi')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.isWakeOnly, true)
assert.equal(p.extractedName, '')

// "Hey Zumi, Apple"
p = parseVoiceCommand('Hey Zumi, Apple')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'apple')

// "Hey Zumi, open Apple"
p = parseVoiceCommand('Hey Zumi, open Apple')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'apple')

// "Hey Zumi, display Apple"
p = parseVoiceCommand('Hey Zumi, display Apple')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'apple')

// Do not accidentally treat "Zumi" as an object
p = parseVoiceCommand('Hey Zumi, Zumi')
assert.equal(p.extractedName, '')

// Consecutive/accumulated commands in continuous stream
p = parseVoiceCommand('Hey Zumi show Apple Hey Zumi show Chocolate')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'chocolate')

p = parseVoiceCommand('Hey Zumi show Apple Hey Zumi show Milk')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.extractedName, 'milk')

p = parseVoiceCommand('Hey Zumi show Apple Hey Zumi')
assert.equal(p.hasWakePhrase, true)
assert.equal(p.isWakeOnly, true)

console.log('✔ Command Parser tests passed')

// 4. Test In-Memory Object Matcher
console.log('Testing in-memory object matcher & child pronunciations...')
const matcher = new ObjectMatcher()

const mockObjects = [
  {
    id: '1',
    name: 'Apple',
    normalizedName: 'apple',
    alternateNames: ['red apple', 'sweet apple'],
    secondLanguageName: 'सेब',
    imageBlob: new Blob([]),
    mimeType: 'image/png',
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: '2',
    name: 'Bhujia',
    normalizedName: 'bhujia',
    alternateNames: ['bhujiya', 'bhujiaa', 'namkeen'],
    secondLanguageName: 'भुजिया',
    imageBlob: new Blob([]),
    mimeType: 'image/png',
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: '3',
    name: 'Apple Juice',
    normalizedName: 'apple juice',
    imageBlob: new Blob([]),
    mimeType: 'image/png',
    createdAt: 3,
    updatedAt: 3,
  },
  {
    id: '4',
    name: 'Red Ball',
    normalizedName: 'red ball',
    alternateNames: ['ball', 'toy ball'],
    imageBlob: new Blob([]),
    mimeType: 'image/png',
    createdAt: 4,
    updatedAt: 4,
  },
]

matcher.updateIndex(mockObjects)

// Exact match
let m = matcher.matchObject('Apple')
assert.equal(m.status, 'exact')
assert.equal(m.object?.name, 'Apple')

// Alternate name match: child says "bhujiya" -> matches Bhujia!
m = matcher.matchObject('bhujiya')
assert.equal(m.status, 'exact')
assert.equal(m.object?.name, 'Bhujia')

// Second language match: child says "सेब" -> matches Apple!
m = matcher.matchObject('सेब')
assert.equal(m.status, 'exact')
assert.equal(m.object?.name, 'Apple')

// Red Ball
m = matcher.matchObject('red ball')
assert.equal(m.status, 'exact')
assert.equal(m.object?.name, 'Red Ball')

// Conservative fuzzy matching: "bhujiaa"
m = matcher.matchObject('bhujiaa')
assert.equal(m.object?.name, 'Bhujia')

// Autocomplete suggestions: "app" -> Apple, Apple Juice
const suggs = matcher.getSuggestions('app')
assert.ok(suggs.length >= 2)
assert.equal(suggs[0].name, 'Apple')
assert.equal(suggs[1].name, 'Apple Juice')

// Unrelated object should not match
m = matcher.matchObject('helicopter airplane spacecraft')
assert.equal(m.status, 'none')

console.log('✔ Object Matcher & child pronunciation tests passed')

// 5. Test Backup Serialization & Audio Support
console.log('Testing backup serialization & audio blob support...')
const testAudioBlob = new Blob(['test-audio-recording-bytes'], { type: 'audio/webm' })
const base64Audio = await blobToBase64(testAudioBlob)
assert.ok(base64Audio.startsWith('data:audio/webm;base64,'))

const restoredAudioBlob = dataUrlToBlob(base64Audio)
assert.equal(restoredAudioBlob.type, 'audio/webm')
assert.equal(restoredAudioBlob.size, testAudioBlob.size)
const restoredAudioText = await restoredAudioBlob.text()
assert.equal(restoredAudioText, 'test-audio-recording-bytes')
console.log('✔ Backup serialization & audio blob tests passed')

// 6. Test CogniCard & WordLearn Backup Compatibility
console.log('Testing CogniCard & WordLearn backup compatibility...')
const cognicardPayload = JSON.stringify({
  appName: 'CogniCard',
  version: 2,
  categories: [{ id: 1, name: 'Fruits', icon: '🍎' }],
  flashcards: [
    {
      id: 1,
      categoryId: 1,
      englishWord: 'Apple',
      hindiWord: 'सेब',
      imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      englishAudioBase64: 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhAAA',
    },
    {
      id: 2,
      categoryId: 1,
      englishWord: 'Banana',
      hindiWord: 'केला',
      imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    },
  ],
})

const parsedCognicard = parseAnyWordPack(cognicardPayload)
assert.equal(parsedCognicard.words.length, 2)
assert.equal(parsedCognicard.words[0].englishWord, 'Apple')
assert.equal(parsedCognicard.words[0].hindiWord, 'सेब')
assert.ok(parsedCognicard.words[0].audioDataUrl)
assert.equal(parsedCognicard.words[1].englishWord, 'Banana')
assert.equal(parsedCognicard.words[1].hindiWord, 'केला')

const wordlearnPayload = JSON.stringify({
  appName: 'Word Learning App',
  version: 2,
  categories: [{ id: 'animals', name: 'Animals', color: '#9333EA' }],
  words: [
    {
      id: 'w_dog_1',
      word: 'dog',
      text: 'DOG',
      englishWord: 'Dog',
      hindiWord: 'कुत्ता',
      category: 'Animals',
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      audioDataUrl: 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhAAA',
    },
  ],
})

const parsedWordlearn = parseAnyWordPack(wordlearnPayload)
assert.equal(parsedWordlearn.words.length, 1)
assert.equal(parsedWordlearn.words[0].word, 'dog')
assert.equal(parsedWordlearn.words[0].englishWord, 'Dog')
assert.equal(parsedWordlearn.words[0].hindiWord, 'कुत्ता')
assert.ok(parsedWordlearn.words[0].imageDataUrl)
assert.ok(parsedWordlearn.words[0].audioDataUrl)
console.log('✔ CogniCard & WordLearn backup compatibility tests passed')

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!')
