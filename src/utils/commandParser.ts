import { normalizeText } from './normalization'

export interface ParsedCommand {
  hasWakePhrase: boolean
  isWakeOnly: boolean
  extractedName: string
  normalizedExtractedName: string
  rawTranscript: string
}

/**
 * Common variations of the wake phrase to detect in speech transcripts.
 */
const DEFAULT_WAKE_PATTERNS = [
  'hey zumi',
  'hey zoomie',
  'hey zoomy',
  'hay zumi',
  'ay zumi',
  'a zumi',
  'hi zumi',
  'hello zumi',
  'ok zumi',
  'okay zumi',
  'zumi',
  'zoomie',
  'zoomy',
]

/**
 * Action command prefixes to strip out when parsing the object name.
 * Sorted from longest to shortest to ensure greedy matching.
 */
const COMMAND_PREFIXES = [
  'could you please show me the',
  'could you please show me',
  'could you please find me',
  'can you please show me the',
  'can you please show me',
  'can you please find me',
  'please show me the',
  'please show me a',
  'please show me an',
  'please show me',
  'please find my',
  'please find the',
  'please find me',
  'please find',
  'please open the',
  'please open',
  'please give me the',
  'please give me',
  'please display',
  'i would like to see the',
  'i would like to see',
  'i would like the',
  'i would like',
  'i want to see the',
  'i want to see',
  'i want the',
  'i want my',
  'i want a',
  'i want an',
  'i want',
  'give me the',
  'give me a',
  'give me an',
  'give me',
  'bring me the',
  'bring me',
  'look for the',
  'look for my',
  'look for a',
  'look for',
  'search for the',
  'search for',
  'where is the',
  'where is my',
  'where is',
  'show me the',
  'show me my',
  'show me a',
  'show me an',
  'show me',
  'show the',
  'show a',
  'show an',
  'show',
  'find my',
  'find the',
  'find a',
  'find an',
  'find',
  'display the',
  'display',
  'open the',
  'open',
  'get me the',
  'get me a',
  'get me',
  'get the',
  'get a',
  'get',
  'picture of the',
  'picture of',
  'photo of the',
  'photo of',
  'image of the',
  'image of',
  'what does',
]

/**
 * Checks if text contains the wake phrase and extracts the command.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  customWakePhrase?: string
): ParsedCommand {
  const normalized = normalizeText(rawTranscript)
  if (!normalized) {
    return {
      hasWakePhrase: false,
      isWakeOnly: false,
      extractedName: '',
      normalizedExtractedName: '',
      rawTranscript,
    }
  }

  // Build wake patterns list
  const wakePatterns: string[] = []
  if (customWakePhrase) {
    const normCustom = normalizeText(customWakePhrase)
    if (normCustom) wakePatterns.push(normCustom)
  }
  for (const pat of DEFAULT_WAKE_PATTERNS) {
    if (!wakePatterns.includes(pat)) {
      wakePatterns.push(pat)
    }
  }

  // Check for wake phrase match
  let hasWakePhrase = false
  let remainingAfterWake = normalized

  for (const pattern of wakePatterns) {
    if (normalized === pattern) {
      return {
        hasWakePhrase: true,
        isWakeOnly: true,
        extractedName: '',
        normalizedExtractedName: '',
        rawTranscript,
      }
    }

    if (normalized.startsWith(pattern + ' ')) {
      hasWakePhrase = true
      remainingAfterWake = normalized.slice(pattern.length).trim()
      break
    } else if (normalized.includes(' ' + pattern + ' ')) {
      // e.g. "say hey zumi show apple"
      hasWakePhrase = true
      const idx = normalized.indexOf(' ' + pattern + ' ')
      remainingAfterWake = normalized.slice(idx + pattern.length + 2).trim()
      break
    }
  }

  // Now strip command action phrases from remainingAfterWake
  let cleanedCommand = remainingAfterWake.trim()

  // Repeatedly strip leading polite words like "please", "can you"
  let changed = true
  while (changed) {
    changed = false
    for (const prefix of COMMAND_PREFIXES) {
      if (cleanedCommand === prefix) {
        cleanedCommand = ''
        changed = true
        break
      }
      if (cleanedCommand.startsWith(prefix + ' ')) {
        cleanedCommand = cleanedCommand.slice(prefix.length).trim()
        changed = true
        break
      }
    }
  }

  // Strip leading articles/fillers if still present: "the ", "a ", "an ", "my "
  // e.g. "please show me the apple" -> remaining was "the apple" -> strips "the" -> "apple"
  // Note: if user said "show me the red ball", this yields "red ball"
  const leadingFillers = ['the ', 'a ', 'an ', 'my ', 'please ']
  for (const filler of leadingFillers) {
    if (cleanedCommand.startsWith(filler)) {
      cleanedCommand = cleanedCommand.slice(filler.length).trim()
      break
    }
  }

  // Also strip trailing question words / filler punctuation
  cleanedCommand = cleanedCommand.replace(/\b(please|thanks|thank you)\b$/gi, '').trim()

  // Guard: if cleanedCommand equals any wake pattern (e.g. child just said "zumi"), don't treat Zumi as object!
  if (wakePatterns.includes(cleanedCommand)) {
    cleanedCommand = ''
  }

  return {
    hasWakePhrase,
    isWakeOnly: hasWakePhrase && !cleanedCommand,
    extractedName: cleanedCommand,
    normalizedExtractedName: normalizeText(cleanedCommand),
    rawTranscript,
  }
}
