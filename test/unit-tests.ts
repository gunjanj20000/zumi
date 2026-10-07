import assert from 'node:assert/strict'
import { normalizeText, levenshteinDistance, calculateSimilarity } from '../src/utils/normalization.ts'
import { parseVoiceCommand } from '../src/utils/commandParser.ts'
import { ObjectMatcher } from '../src/services/objectMatcher.ts'

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
console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!')
