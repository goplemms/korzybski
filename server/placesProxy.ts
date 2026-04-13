/**
 * Minimal HTTP proxy for Google Places API (New) Nearby Search.
 * Keeps the API key off the client. Run alongside Vite (see README).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.PORT) || 8787
const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? ''

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'
/** Pro-tier fields only; avoids Enterprise SKUs (rating, hours, etc.). */
const FIELD_MASK = 'places.id,places.displayName,places.googleMapsUri'

type NearbyBody = {
  latitude?: unknown
  longitude?: unknown
  radiusMeters?: unknown
  maxResultCount?: unknown
}

function setCors(res: ServerResponse) {
  if (CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  setCors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.writeHead(status)
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handleNearby(req: IncomingMessage, res: ServerResponse) {
  if (!API_KEY) {
    json(res, 503, {
      error: 'Server missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add your key.',
    })
    return
  }

  let raw: string
  try {
    raw = await readBody(req)
  } catch {
    json(res, 400, { error: 'Could not read request body' })
    return
  }

  let body: NearbyBody
  try {
    body = raw ? (JSON.parse(raw) as NearbyBody) : {}
  } catch {
    json(res, 400, { error: 'Invalid JSON body' })
    return
  }

  const lat = body.latitude
  const lng = body.longitude
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    json(res, 400, { error: 'Body must include numeric latitude and longitude' })
    return
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    json(res, 400, { error: 'latitude or longitude out of range' })
    return
  }

  let radius = typeof body.radiusMeters === 'number' && Number.isFinite(body.radiusMeters) ? body.radiusMeters : 1200
  radius = Math.min(50_000, Math.max(100, Math.round(radius)))

  let maxResultCount =
    typeof body.maxResultCount === 'number' && Number.isFinite(body.maxResultCount) ? body.maxResultCount : 20
  maxResultCount = Math.min(20, Math.max(1, Math.round(maxResultCount)))

  const upstream = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
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
    json(res, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, {
      error: 'Google Places request failed',
      details: parsed,
    })
    return
  }

  let data: {
    places?: Array<{ id?: string; displayName?: { text?: string }; googleMapsUri?: string }>
  }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    json(res, 502, { error: 'Invalid JSON from Google Places' })
    return
  }

  const places = (data.places ?? [])
    .map((p) => ({
      id: p.id ?? '',
      name: p.displayName?.text?.trim() ?? '',
      mapsUrl: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : undefined,
    }))
    .filter((p) => p.id && p.name)

  json(res, 200, { places })
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/'
  const path = url.split('?')[0] ?? '/'

  if (req.method === 'OPTIONS' && path === '/api/places/nearby') {
    setCors(res)
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && path === '/api/places/nearby') {
    await handleNearby(req, res)
    return
  }

  if (req.method === 'GET' && path === '/health') {
    json(res, 200, { ok: true, hasKey: Boolean(API_KEY) })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Places proxy listening on http://127.0.0.1:${PORT}`)
  if (!API_KEY) {
    console.warn('GOOGLE_MAPS_API_KEY is not set; /api/places/nearby will return 503.')
  }
})
