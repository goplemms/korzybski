import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyPoiAnswer,
  createPoi,
  mapsLinkForPlace,
  rankedPois,
  scoreDeltaForAnswer,
} from './poiSession.ts'

test('scoreDeltaForAnswer', () => {
  assert.equal(scoreDeltaForAnswer('yes'), 1)
  assert.equal(scoreDeltaForAnswer('no'), -1)
  assert.equal(scoreDeltaForAnswer('skip'), 0)
})

test('mapsLinkForPlace prefers googleMapsUri', () => {
  const u = mapsLinkForPlace(
    createPoi('ChIJxxx', 'X', { mapsUrl: '  https://maps.google.com/?cid=1  ' }),
  )
  assert.equal(u, 'https://maps.google.com/?cid=1')
})

test('mapsLinkForPlace falls back to query_place_id for ChIJ ids', () => {
  const u = mapsLinkForPlace(createPoi('ChIJAbCdEfGhIjKlMnOpQrStUvWx', 'Somewhere'))
  assert.ok(u?.includes('query_place_id='))
  assert.ok(u?.includes(encodeURIComponent('ChIJAbCdEfGhIjKlMnOpQrStUvWx')))
})

test('mapsLinkForPlace falls back to name search when no uri and non-Google id', () => {
  const u = mapsLinkForPlace(createPoi('1', 'Neon Noodle'))
  assert.equal(u, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Neon Noodle'))
})

test('applyPoiAnswer yes bumps score and sets yesMapsUrl', () => {
  const next = applyPoiAnswer(
    {
      pois: [
        createPoi('a', 'A', { mapsUrl: 'https://maps.example/a' }),
        createPoi('b', 'B'),
      ],
      currentIndex: 0,
      lastAnswer: null,
      yesMapsUrl: null,
    },
    'yes',
    { nowMs: 100 },
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 1)
  assert.equal(next.pois[0].answerCounts.yes, 1)
  assert.equal(next.pois[0].lastInteractedAt, 100)
  assert.equal(next.pois[1].score, 0)
  assert.equal(next.currentIndex, 1)
  assert.equal(next.lastAnswer, 'yes')
  assert.equal(next.yesMapsUrl, 'https://maps.example/a')
})

test('applyPoiAnswer yes uses mapsLinkForPlace when mapsUrl missing', () => {
  const next = applyPoiAnswer(
    {
      pois: [createPoi('1', 'Cafe')],
      currentIndex: 0,
      lastAnswer: null,
      yesMapsUrl: null,
    },
    'yes',
  )
  assert.ok(next)
  assert.equal(next.yesMapsUrl, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Cafe'))
})

test('applyPoiAnswer no lowers score and clears yesMapsUrl', () => {
  const p = createPoi('a', 'A')
  p.score = 1
  p.answerCounts = { yes: 1, no: 0, skip: 0 }
  const next = applyPoiAnswer(
    {
      pois: [p],
      currentIndex: 0,
      lastAnswer: 'yes',
      yesMapsUrl: 'https://old',
    },
    'no',
    { nowMs: 200 },
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 0)
  assert.equal(next.pois[0].answerCounts.no, 1)
  assert.equal(next.lastAnswer, 'no')
  assert.equal(next.yesMapsUrl, null)
})

test('applyPoiAnswer skip leaves score and clears yesMapsUrl', () => {
  const p = createPoi('a', 'A')
  p.score = 2
  p.answerCounts = { yes: 2, no: 0, skip: 0 }
  const next = applyPoiAnswer(
    {
      pois: [p],
      currentIndex: 0,
      lastAnswer: 'yes',
      yesMapsUrl: 'https://old',
    },
    'skip',
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 2)
  assert.equal(next.pois[0].answerCounts.skip, 1)
  assert.equal(next.lastAnswer, 'skip')
  assert.equal(next.yesMapsUrl, null)
})

test('applyPoiAnswer wraps currentIndex', () => {
  const next = applyPoiAnswer(
    {
      pois: [createPoi('a', 'A'), createPoi('b', 'B')],
      currentIndex: 1,
      lastAnswer: null,
      yesMapsUrl: null,
    },
    'skip',
  )
  assert.ok(next)
  assert.equal(next.currentIndex, 0)
})

test('applyPoiAnswer returns null for empty pois', () => {
  assert.equal(
    applyPoiAnswer({ pois: [], currentIndex: 0, lastAnswer: null, yesMapsUrl: null }, 'yes'),
    null,
  )
})

test('rankedPois sorts by score then recency then name', () => {
  const a = createPoi('1', 'A')
  a.score = 1
  a.lastInteractedAt = 50
  const b = createPoi('2', 'B')
  b.score = 1
  b.lastInteractedAt = 100
  const c = createPoi('3', 'C')
  c.score = 0
  const r = rankedPois([a, b, c])
  assert.deepEqual(
    r.map((p) => p.id),
    ['2', '1', '3'],
  )
})
