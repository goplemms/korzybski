/**
 * Decision material for ranking places: what we store per POI and how we compare.
 * Extend here as the algorithm grows (weights, decay, custom tags, etc.).
 */

export type Answer = 'yes' | 'no' | 'skip'

export type AnswerCounts = {
  yes: number
  no: number
  skip: number
}

/** Per-place aggregates derived from swipe choices */
export type PlaceDecisionMaterial = {
  /** Net preference: +1 yes, −1 no, 0 skip (same as today; tune later) */
  score: number
  /** Last time this place received any answer (ms since epoch). Null = never in this session. */
  lastInteractedAt: number | null
  /** Running counts — “tags” of how often each outcome happened for this place */
  answerCounts: AnswerCounts
}

export function emptyAnswerCounts(): AnswerCounts {
  return { yes: 0, no: 0, skip: 0 }
}

export function emptyDecisionMaterial(): PlaceDecisionMaterial {
  return {
    score: 0,
    lastInteractedAt: null,
    answerCounts: emptyAnswerCounts(),
  }
}

export function scoreDeltaForAnswer(answer: Answer): number {
  if (answer === 'yes') return 1
  if (answer === 'no') return -1
  return 0
}

/** Update material after one choice at `nowMs` (inject for tests). */
export function applyAnswerToMaterial(
  material: PlaceDecisionMaterial,
  answer: Answer,
  nowMs: number,
): PlaceDecisionMaterial {
  const nextCounts = { ...material.answerCounts }
  nextCounts[answer] += 1
  return {
    score: material.score + scoreDeltaForAnswer(answer),
    lastInteractedAt: nowMs,
    answerCounts: nextCounts,
  }
}

/**
 * Sort key: higher score first, then more recently interacted, then name.
 * Places never touched (lastInteractedAt null) sort as “least recent” among ties.
 */
export function comparePlacesForRanking(
  a: PlaceDecisionMaterial & { name: string },
  b: PlaceDecisionMaterial & { name: string },
): number {
  if (b.score !== a.score) return b.score - a.score
  const ta = a.lastInteractedAt ?? -Infinity
  const tb = b.lastInteractedAt ?? -Infinity
  if (tb !== ta) return tb - ta
  return a.name.localeCompare(b.name)
}
