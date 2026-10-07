/**
 * Text normalization and fuzzy distance utilities
 */

/**
 * Normalizes text by lowercasing, removing punctuation (preserving letters & digits & unicode),
 * and collapsing multiple spaces.
 */
export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation but keep alphanumeric and combining marks from any script (including Hindi/Devanagari vowels)
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, '')
    // Collapse consecutive whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculates Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const m = a.length
  const n = b.length

  // Use two rows for memory efficiency
  let prevRow = new Array<number>(n + 1)
  let currRow = new Array<number>(n + 1)

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    const charA = a[i - 1]

    for (let j = 1; j <= n; j++) {
      const charB = b[j - 1]
      const cost = charA === charB ? 0 : 1

      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      )
    }

    // Swap rows
    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  return prevRow[n]
}

/**
 * Computes a normalized similarity score between 0.0 and 1.0.
 * 1.0 means identical.
 */
export function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 && !s2) return 1
  if (!s1 || !s2) return 0
  if (s1 === s2) return 1

  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const dist = levenshteinDistance(s1, s2)
  return Math.max(0, 1 - dist / maxLen)
}
