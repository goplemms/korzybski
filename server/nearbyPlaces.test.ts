import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PLACES_FIELD_MASK, PLACES_URL, nearbyPlacesResult } from './nearbyPlaces.ts'

function mockFetch(handler) {
  return (url, init) => handler(String(url), init ?? {})
}

test('returns 503 when API key is missing', async () => {
  const r = await nearbyPlacesResult({ latitude: 40.7, longitude: -74 }, {
    apiKey: '',
    fetchFn: async () => new Response('{}'),
  })
  assert.equal(r.status, 503)
  const err = r.body && typeof r.body === 'object' && 'error' in r.body ? r.body.error : ''
  assert.match(String(err), /GOOGLE_MAPS_API_KEY/)
})

test('returns 400 when latitude/longitude missing or invalid', async () => {
  const fetchNever = mockFetch(async () => new Response('{}'))

  const bodies = [
    {},
    { latitude: 'x', longitude: 0 },
    { latitude: 0, longitude: null },
    { latitude: NaN, longitude: 0 },
  ]
  for (const body of bodies) {
    const result = await nearbyPlacesResult(body, { apiKey: 'k', fetchFn: fetchNever })
    assert.equal(result.status, 400)
  }
})

test('returns 400 when coordinates out of range', async () => {
  const fetchNever = mockFetch(async () => new Response('{}'))
  const r = await nearbyPlacesResult({ latitude: 91, longitude: 0 }, { apiKey: 'k', fetchFn: fetchNever })
  assert.equal(r.status, 400)
})

test('calls Google with expected URL, headers, and JSON body', async () => {
  let seenUrl = ''
  let seenInit = {}

  const fetchFn = mockFetch(async (url, init) => {
    seenUrl = url
    seenInit = init
    return new Response(JSON.stringify({ places: [] }), { status: 200 })
  })

  await nearbyPlacesResult(
    { latitude: 37.7937, longitude: -122.3965, radiusMeters: 500, maxResultCount: 10 },
    { apiKey: 'test-key', fetchFn },
  )

  assert.equal(seenUrl, PLACES_URL)
  assert.equal(seenInit.method, 'POST')
  const h = new Headers(seenInit.headers)
  assert.equal(h.get('Content-Type'), 'application/json')
  assert.equal(h.get('X-Goog-Api-Key'), 'test-key')
  assert.equal(h.get('X-Goog-FieldMask'), PLACES_FIELD_MASK)

  const payload = JSON.parse(String(seenInit.body))
  assert.deepEqual(payload.includedTypes, ['restaurant'])
  assert.equal(payload.maxResultCount, 10)
  assert.equal(payload.rankPreference, 'POPULARITY')
  assert.equal(payload.regionCode, 'US')
  assert.equal(payload.languageCode, 'en')
  assert.equal(payload.locationRestriction.circle.radius, 500)
  assert.deepEqual(payload.locationRestriction.circle.center, {
    latitude: 37.7937,
    longitude: -122.3965,
  })
})

test('clamps small radius up and maxResultCount down', async () => {
  let payload = {}

  const fetchFn = mockFetch(async (_url, init) => {
    payload = JSON.parse(String(init.body))
    return new Response(JSON.stringify({ places: [] }), { status: 200 })
  })

  await nearbyPlacesResult(
    { latitude: 0, longitude: 0, radiusMeters: 5, maxResultCount: 99 },
    { apiKey: 'k', fetchFn },
  )
  assert.equal(payload.locationRestriction.circle.radius, 100)
  assert.equal(payload.maxResultCount, 20)
})

test('clamps radius max to 50000 and maxResultCount min to 1', async () => {
  let lastBody = ''
  const fetchFn = mockFetch(async (_url, init) => {
    lastBody = String(init.body)
    return new Response(JSON.stringify({ places: [] }), { status: 200 })
  })

  await nearbyPlacesResult(
    { latitude: 1, longitude: 1, radiusMeters: 200000, maxResultCount: -3 },
    { apiKey: 'k', fetchFn },
  )
  const p = JSON.parse(lastBody)
  assert.equal(p.locationRestriction.circle.radius, 50000)
  assert.equal(p.maxResultCount, 1)
})

test('maps successful Google response to places list', async () => {
  const fetchFn = mockFetch(async () =>
    new Response(
      JSON.stringify({
        places: [
          {
            id: 'ChIJxxx',
            displayName: { text: '  Test Cafe  ', languageCode: 'en' },
            googleMapsUri: 'https://maps.google.com/?cid=1',
          },
          { id: '', displayName: { text: 'No id' } },
          { id: 'x', displayName: { text: '' } },
        ],
      }),
      { status: 200 },
    ),
  )

  const r = await nearbyPlacesResult({ latitude: 0, longitude: 0 }, { apiKey: 'k', fetchFn })
  assert.equal(r.status, 200)
  assert.ok(r.body && typeof r.body === 'object' && 'places' in r.body)
  const places = r.body.places
  assert.equal(places.length, 1)
  assert.deepEqual(places[0], {
    id: 'ChIJxxx',
    name: 'Test Cafe',
    mapsUrl: 'https://maps.google.com/?cid=1',
  })
})

test('forwards Google error status and body', async () => {
  const fetchFn = mockFetch(async () =>
    new Response(JSON.stringify({ error: { code: 403, message: 'denied' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

  const r = await nearbyPlacesResult({ latitude: 0, longitude: 0 }, { apiKey: 'k', fetchFn })
  assert.equal(r.status, 403)
  assert.ok(r.body && typeof r.body === 'object')
  assert.equal(r.body.error, 'Google Places request failed')
  assert.ok('details' in r.body && r.body.details)
})

test('returns 502 when Google returns non-JSON success body', async () => {
  const fetchFn = mockFetch(async () => new Response('not json', { status: 200 }))
  const r = await nearbyPlacesResult({ latitude: 0, longitude: 0 }, { apiKey: 'k', fetchFn })
  assert.equal(r.status, 502)
})
