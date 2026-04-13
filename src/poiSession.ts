export type Answer = 'yes' | 'no' | 'skip'

export type Poi = { id: string; name: string; score: number; mapsUrl?: string }

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

export function scoreDeltaForAnswer(answer: Answer): number {
  if (answer === 'yes') return 1
  if (answer === 'no') return -1
  return 0
}

export function rankedPois(pois: Poi[]): Poi[] {
  return [...pois].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

/**
 * Apply yes/no/skip to the current POI, advance to the next, and set `yesMapsUrl` only on "yes".
 */
export function applyPoiAnswer(
  snapshot: PoiSessionSnapshot,
  answer: Answer,
): PoiSessionSnapshot | null {
  const { pois, currentIndex } = snapshot
  if (pois.length === 0) return null
  const current = pois[currentIndex]
  if (!current) return null

  const delta = scoreDeltaForAnswer(answer)
  const nextPois = pois.map((p) => (p.id === current.id ? { ...p, score: p.score + delta } : p))

  const yesMapsUrl = answer === 'yes' ? mapsLinkForPlace(current) ?? null : null

  return {
    pois: nextPois,
    currentIndex: (currentIndex + 1) % pois.length,
    lastAnswer: answer,
    yesMapsUrl,
  }
}
