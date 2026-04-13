import {
  applyAnswerToMaterial,
  comparePlacesForRanking,
  emptyDecisionMaterial,
  scoreDeltaForAnswer,
  type Answer,
  type PlaceDecisionMaterial,
} from './scoring/decisionMaterial'

export type { Answer }
export { scoreDeltaForAnswer }

export type Poi = {
  id: string
  name: string
  mapsUrl?: string
} & PlaceDecisionMaterial

export type PoiSessionSnapshot = {
  pois: Poi[]
  currentIndex: number
  lastAnswer: Answer | null
  /** Present after the user answers "yes" — link for the POI they approved. */
  yesMapsUrl: string | null
}

/** Best Maps URL for a POI: API `googleMapsUri`, else place-id search, else name search. */
export function mapsLinkForPlace(poi: Poi): string | undefined {
  const direct = poi.mapsUrl?.trim()
  if (direct) return direct
  const id = poi.id.trim()
  if (id.startsWith('ChIJ')) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`
  }
  const name = poi.name.trim()
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
  }
  return undefined
}

export function rankedPois(pois: Poi[]): Poi[] {
  return [...pois].sort(comparePlacesForRanking)
}

export type ApplyPoiAnswerOptions = {
  /** Wall clock for recency (defaults to `Date.now()`). */
  nowMs?: number
}

/**
 * Apply yes/no/skip to the current POI, advance to the next, and set `yesMapsUrl` only on "yes".
 */
export function applyPoiAnswer(
  snapshot: PoiSessionSnapshot,
  answer: Answer,
  options?: ApplyPoiAnswerOptions,
): PoiSessionSnapshot | null {
  const { pois, currentIndex } = snapshot
  if (pois.length === 0) return null
  const current = pois[currentIndex]
  if (!current) return null

  const nowMs = options?.nowMs ?? Date.now()
  const material = applyAnswerToMaterial(
    {
      score: current.score,
      lastInteractedAt: current.lastInteractedAt,
      answerCounts: current.answerCounts,
    },
    answer,
    nowMs,
  )

  const nextPois = pois.map((p) =>
    p.id === current.id
      ? {
          ...p,
          score: material.score,
          lastInteractedAt: material.lastInteractedAt,
          answerCounts: material.answerCounts,
        }
      : p,
  )

  const yesMapsUrl = answer === 'yes' ? mapsLinkForPlace(current) ?? null : null

  return {
    pois: nextPois,
    currentIndex: (currentIndex + 1) % pois.length,
    lastAnswer: answer,
    yesMapsUrl,
  }
}

/** Build a POI with default decision material (demo / fresh loads). */
export function createPoi(id: string, name: string, extra?: { mapsUrl?: string }): Poi {
  return {
    ...emptyDecisionMaterial(),
    id,
    name,
    ...(extra?.mapsUrl !== undefined ? { mapsUrl: extra.mapsUrl } : {}),
  }
}
