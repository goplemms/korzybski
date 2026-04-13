import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyPoiAnswer,
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
  const u = mapsLinkForPlace({
    id: 'ChIJxxx',
    name: 'X',
    score: 0,
    mapsUrl: '  https://maps.google.com/?cid=1  ',
  })
  assert.equal(u, 'https://maps.google.com/?cid=1')
})

test('mapsLinkForPlace falls back to query_place_id for ChIJ ids', () => {
  const u = mapsLinkForPlace({
    id: 'ChIJAbCdEfGhIjKlMnOpQrStUvWx',
    name: 'Somewhere',
    score: 0,
  })
  assert.ok(u?.includes('query_place_id='))
  assert.ok(u?.includes(encodeURIComponent('ChIJAbCdEfGhIjKlMnOpQrStUvWx')))
})

test('mapsLinkForPlace falls back to name search when no uri and non-Google id', () => {
  const u = mapsLinkForPlace({ id: '1', name: 'Neon Noodle', score: 0 })
  assert.equal(u, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Neon Noodle'))
})

test('applyPoiAnswer yes bumps score and sets yesMapsUrl', () => {
  const next = applyPoiAnswer(
    {
      pois: [
        { id: 'a', name: 'A', score: 0, mapsUrl: 'https://maps.example/a' },
        { id: 'b', name: 'B', score: 0 },
      ],
      currentIndex: 0,
      lastAnswer: null,
      yesMapsUrl: null,
    },
    'yes',
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 1)
  assert.equal(next.pois[1].score, 0)
  assert.equal(next.currentIndex, 1)
  assert.equal(next.lastAnswer, 'yes')
  assert.equal(next.yesMapsUrl, 'https://maps.example/a')
})

test('applyPoiAnswer yes uses mapsLinkForPlace when mapsUrl missing', () => {
  const next = applyPoiAnswer(
    {
      pois: [{ id: '1', name: 'Cafe', score: 0 }],
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
  const next = applyPoiAnswer(
    {
      pois: [{ id: 'a', name: 'A', score: 1 }],
      currentIndex: 0,
      lastAnswer: 'yes',
      yesMapsUrl: 'https://old',
    },
    'no',
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 0)
  assert.equal(next.lastAnswer, 'no')
  assert.equal(next.yesMapsUrl, null)
})

test('applyPoiAnswer skip leaves score and clears yesMapsUrl', () => {
  const next = applyPoiAnswer(
    {
      pois: [{ id: 'a', name: 'A', score: 2 }],
      currentIndex: 0,
      lastAnswer: 'yes',
      yesMapsUrl: 'https://old',
    },
    'skip',
  )
  assert.ok(next)
  assert.equal(next.pois[0].score, 2)
  assert.equal(next.lastAnswer, 'skip')
  assert.equal(next.yesMapsUrl, null)
})

test('applyPoiAnswer wraps currentIndex', () => {
  const next = applyPoiAnswer(
    {
      pois: [
        { id: 'a', name: 'A', score: 0 },
        { id: 'b', name: 'B', score: 0 },
      ],
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

test('rankedPois sorts by score then name', () => {
  const r = rankedPois([
    { id: '2', name: 'B', score: 1 },
    { id: '1', name: 'A', score: 1 },
    { id: '3', name: 'C', score: 0 },
  ])
  assert.deepEqual(
    r.map((p) => p.id),
    ['1', '2', '3'],
  )
})
