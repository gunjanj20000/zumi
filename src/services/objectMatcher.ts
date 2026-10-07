import type { ObjectCard, MatchResult } from '../types/types'
import { normalizeText, calculateSimilarity } from '../utils/normalization'

export class ObjectMatcher {
  private objects: ObjectCard[] = []
  private nameMap: Map<string, ObjectCard> = new Map()
  private alternateNameMap: Map<string, ObjectCard> = new Map()

  /**
   * Initializes or updates the in-memory index from objects.
   */
  public updateIndex(objects: ObjectCard[]): void {
    this.objects = [...objects]
    this.nameMap.clear()
    this.alternateNameMap.clear()

    for (const obj of objects) {
      const norm = obj.normalizedName || normalizeText(obj.name)
      if (norm) {
        this.nameMap.set(norm, obj)
      }

      if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          const normAlt = normalizeText(alt)
          if (normAlt) {
            this.alternateNameMap.set(normAlt, obj)
          }
        }
      }
    }
  }

  /**
   * Gets all indexed objects.
   */
  public getAll(): ObjectCard[] {
    return this.objects
  }

  /**
   * Searches the in-memory index for a given speech query or typed query.
   */
  public matchObject(query: string): MatchResult {
    const rawQuery = query.trim()
    const normalizedQuery = normalizeText(query)

    if (!normalizedQuery || this.objects.length === 0) {
      return { status: 'none', matchedQuery: rawQuery }
    }

    // 1. Exact match against primary name
    for (const obj of this.objects) {
      if (obj.name.toLowerCase() === rawQuery.toLowerCase()) {
        return { status: 'exact', object: obj, score: 1.0, matchedQuery: rawQuery }
      }
    }

    // 2. Normalized exact match against primary name
    const exactNameMatch = this.nameMap.get(normalizedQuery)
    if (exactNameMatch) {
      return { status: 'exact', object: exactNameMatch, score: 1.0, matchedQuery: rawQuery }
    }

    // 3. Alternate-name exact match
    const exactAltMatch = this.alternateNameMap.get(normalizedQuery)
    if (exactAltMatch) {
      return { status: 'exact', object: exactAltMatch, score: 1.0, matchedQuery: rawQuery }
    }

    // Check alternate names with lowercasing
    for (const obj of this.objects) {
      if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          if (alt.toLowerCase() === rawQuery.toLowerCase() || normalizeText(alt) === normalizedQuery) {
            return { status: 'exact', object: obj, score: 1.0, matchedQuery: rawQuery }
          }
        }
      }
      if (obj.secondLanguageName && normalizeText(obj.secondLanguageName) === normalizedQuery) {
        return { status: 'exact', object: obj, score: 1.0, matchedQuery: rawQuery }
      }
    }

    // 4. startsWith match
    const startsWithMatches: ObjectCard[] = []
    for (const obj of this.objects) {
      const norm = obj.normalizedName || normalizeText(obj.name)
      if (norm.startsWith(normalizedQuery) || normalizedQuery.startsWith(norm)) {
        startsWithMatches.push(obj)
      } else if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          const normAlt = normalizeText(alt)
          if (normAlt.startsWith(normalizedQuery) || normalizedQuery.startsWith(normAlt)) {
            startsWithMatches.push(obj)
            break
          }
        }
      }
    }

    if (startsWithMatches.length === 1) {
      return { status: 'confident', object: startsWithMatches[0], score: 0.95, matchedQuery: rawQuery }
    } else if (startsWithMatches.length > 1) {
      return {
        status: 'ambiguous',
        candidates: startsWithMatches.slice(0, 4),
        score: 0.85,
        matchedQuery: rawQuery,
      }
    }

    // 5. contains match
    const containsMatches: ObjectCard[] = []
    for (const obj of this.objects) {
      const norm = obj.normalizedName || normalizeText(obj.name)
      if (norm.includes(normalizedQuery) || normalizedQuery.includes(norm)) {
        containsMatches.push(obj)
      } else if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          const normAlt = normalizeText(alt)
          if (normAlt.includes(normalizedQuery) || normalizedQuery.includes(normAlt)) {
            containsMatches.push(obj)
            break
          }
        }
      }
    }

    if (containsMatches.length === 1) {
      return { status: 'confident', object: containsMatches[0], score: 0.88, matchedQuery: rawQuery }
    } else if (containsMatches.length > 1) {
      return {
        status: 'ambiguous',
        candidates: containsMatches.slice(0, 4),
        score: 0.8,
        matchedQuery: rawQuery,
      }
    }

    // 6. Conservative Fuzzy Matching
    // Calculate highest similarity score for each object against primary name and alternate names
    const scoredObjects: { object: ObjectCard; score: number }[] = []

    for (const obj of this.objects) {
      const norm = obj.normalizedName || normalizeText(obj.name)
      let maxScore = calculateSimilarity(normalizedQuery, norm)

      if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          const normAlt = normalizeText(alt)
          const altScore = calculateSimilarity(normalizedQuery, normAlt)
          if (altScore > maxScore) {
            maxScore = altScore
          }
        }
      }

      // Check second language name if relevant
      if (obj.secondLanguageName) {
        const normLang = normalizeText(obj.secondLanguageName)
        const langScore = calculateSimilarity(normalizedQuery, normLang)
        if (langScore > maxScore) {
          maxScore = langScore
        }
      }

      // Conservative threshold: minimum 0.70 to even be considered a candidate
      if (maxScore >= 0.70) {
        scoredObjects.push({ object: obj, score: maxScore })
      }
    }

    // Sort descending by score
    scoredObjects.sort((a, b) => b.score - a.score)

    if (scoredObjects.length === 0) {
      return { status: 'none', matchedQuery: rawQuery }
    }

    const top = scoredObjects[0]

    // High confidence fuzzy match: score >= 0.80 and significantly better than second place
    const secondScore = scoredObjects.length > 1 ? scoredObjects[1].score : 0
    if (top.score >= 0.82 && top.score - secondScore >= 0.1) {
      return {
        status: 'confident',
        object: top.object,
        score: top.score,
        matchedQuery: rawQuery,
      }
    }

    // Uncertain fuzzy matches: provide top 2-4 candidates for "Did you mean?"
    const candidates = scoredObjects.slice(0, 4).map((s) => s.object)
    return {
      status: 'ambiguous',
      candidates,
      score: top.score,
      matchedQuery: rawQuery,
    }
  }

  /**
   * Fast suggestions for typed search box.
   * Priority:
   * 1. startsWith matches first
   * 2. contains matches second
   * Limit ~6 suggestions.
   */
  public getSuggestions(query: string, limit = 6): ObjectCard[] {
    const normQuery = normalizeText(query)
    if (!normQuery || this.objects.length === 0) return []

    const startsWithList: ObjectCard[] = []
    const containsList: ObjectCard[] = []
    const seenIds = new Set<string>()

    // Pass 1: startsWith on primary name
    for (const obj of this.objects) {
      const normName = obj.normalizedName || normalizeText(obj.name)
      if (normName.startsWith(normQuery)) {
        startsWithList.push(obj)
        seenIds.add(obj.id)
        if (startsWithList.length >= limit) return startsWithList
      }
    }

    // Pass 2: startsWith on alternate names
    for (const obj of this.objects) {
      if (seenIds.has(obj.id)) continue
      if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          if (normalizeText(alt).startsWith(normQuery)) {
            startsWithList.push(obj)
            seenIds.add(obj.id)
            break
          }
        }
      }
      if (startsWithList.length >= limit) return startsWithList
    }

    // Pass 3: contains on primary name
    for (const obj of this.objects) {
      if (seenIds.has(obj.id)) continue
      const normName = obj.normalizedName || normalizeText(obj.name)
      if (normName.includes(normQuery)) {
        containsList.push(obj)
        seenIds.add(obj.id)
      }
    }

    // Pass 4: contains on alternate names
    for (const obj of this.objects) {
      if (seenIds.has(obj.id)) continue
      if (obj.alternateNames) {
        for (const alt of obj.alternateNames) {
          if (normalizeText(alt).includes(normQuery)) {
            containsList.push(obj)
            seenIds.add(obj.id)
            break
          }
        }
      }
    }

    return [...startsWithList, ...containsList].slice(0, limit)
  }
}

export const objectMatcher = new ObjectMatcher()
