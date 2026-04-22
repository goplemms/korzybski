import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  comfortRadiusMeters,
  DEFAULT_BASE_DISTANCE,
  emptyPlaceExposureAggregate,
  getWeekdayContext,
} from './discoveryModel.ts'

test('getWeekdayContext marks weekend for Saturday and Sunday', () => {
  assert.equal(getWeekdayContext(new Date('2026-04-11T12:00:00')).isWeekend, true)
  assert.equal(getWeekdayContext(new Date('2026-04-11T12:00:00')).dayOfWeek, 6)
  assert.equal(getWeekdayContext(new Date('2026-04-12T12:00:00')).isWeekend, true)
  assert.equal(getWeekdayContext(new Date('2026-04-12T12:00:00')).dayOfWeek, 0)
})

test('getWeekdayContext marks weekday for Wednesday', () => {
  const ctx = getWeekdayContext(new Date('2026-04-08T09:00:00'))
  assert.equal(ctx.isWeekend, false)
  assert.equal(ctx.dayOfWeek, 3)
})

test('comfortRadiusMeters uses weekend vs weekday from prefs', () => {
  const prefs = { weekdayComfortMeters: 800, weekendComfortMeters: 2500 }
  assert.equal(comfortRadiusMeters(prefs, { dayOfWeek: 3, isWeekend: false }), 800)
  assert.equal(comfortRadiusMeters(prefs, { dayOfWeek: 6, isWeekend: true }), 2500)
})

test('DEFAULT_BASE_DISTANCE keeps weekend larger than weekday', () => {
  assert.ok(DEFAULT_BASE_DISTANCE.weekendComfortMeters > DEFAULT_BASE_DISTANCE.weekdayComfortMeters)
})

test('emptyPlaceExposureAggregate initializes counters', () => {
  const a = emptyPlaceExposureAggregate('ChIJx')
  assert.equal(a.placeId, 'ChIJx')
  assert.equal(a.exposureCount, 0)
  assert.equal(a.firstSeenAt, null)
  assert.equal(a.lastShownAt, null)
})
