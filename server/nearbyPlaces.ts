/**
 * Core logic for Places API (New) Nearby Search proxy — testable without HTTP server.
 */
export const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'

/** Pro-tier fields only; avoids Enterprise SKUs (rating, hours, etc.). */
export const PLACES_FIELD_MASK = 'places.id,places.displayName,places.googleMapsUri'

const DEFAULT_RADIUS_M = 1200
const MIN_RADIUS_M = 100
const MAX_RADIUS_M = 50_000
const DEFAULT_MAX_RESULTS = 20
const MIN_MAX_RESULTS = 1
const MAX_MAX_RESULTS = 20

function clampRounded(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)))
}

export type NearbyBody = {
  latitude?: unknown
  longitude?: unknown
  radiusMeters?: unknown
  maxResultCount?: unknown
}

export type NearbyPlacesResult = { status: number; body: unknown }

export async function nearbyPlacesResult(
  body: NearbyBody,
  options: { apiKey: string; fetchFn: typeof fetch },
): Promise<NearbyPlacesResult> {
  const { apiKey, fetchFn } = options

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: 'Server missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add your key.',
      },
    }
  }

  const lat = body.latitude
  const lng = body.longitude
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: 400, body: { error: 'Body must include numeric latitude and longitude' } }
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { status: 400, body: { error: 'latitude or longitude out of range' } }
  }

  const rawRadius =
    typeof body.radiusMeters === 'number' && Number.isFinite(body.radiusMeters) ? body.radiusMeters : DEFAULT_RADIUS_M
  const radius = clampRounded(rawRadius, MIN_RADIUS_M, MAX_RADIUS_M)

  const rawMax =
    typeof body.maxResultCount === 'number' && Number.isFinite(body.maxResultCount)
      ? body.maxResultCount
      : DEFAULT_MAX_RESULTS
  const maxResultCount = clampRounded(rawMax, MIN_MAX_RESULTS, MAX_MAX_RESULTS)

  const upstream = await fetchFn(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      maxResultCount,
      rankPreference: 'POPULARITY',
      regionCode: 'US',
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
    }),
  })

  const text = await upstream.text()
  if (!upstream.ok) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
    const status =
      upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502
    return {
      status,
      body: { error: 'Google Places request failed', details: parsed },
    }
  }

  let data: {
    places?: Array<{ id?: string; displayName?: { text?: string }; googleMapsUri?: string }>
  }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    return { status: 502, body: { error: 'Invalid JSON from Google Places' } }
  }

  const places = (data.places ?? [])
    .map((p) => ({
      id: p.id ?? '',
      name: p.displayName?.text?.trim() ?? '',
      mapsUrl: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : undefined,
    }))
    .filter((p) => p.id && p.name)

  return { status: 200, body: { places } }
}
