/**
 * Minimal HTTP proxy for Google Places API (New) Nearby Search.
 * Keeps the API key off the client. Run alongside Vite (see README).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { nearbyPlacesResult, type NearbyBody } from './nearbyPlaces.ts'

const PORT = Number(process.env.PORT) || 8787
const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? ''

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

  const result = await nearbyPlacesResult(body, { apiKey: API_KEY, fetchFn: fetch })
  json(res, result.status, result.body)
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
