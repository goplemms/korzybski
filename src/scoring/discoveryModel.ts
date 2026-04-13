/**
 * Data model for future ranking / rotation algorithms: event log, sessions,
 * exposure aggregates, and weekday vs weekend base distance (search / walk comfort).
 *
 * Nothing here persists yet — wire to localStorage or a backend when ready.
 */

import type { Answer } from './decisionMaterial.ts'

/** Where the carousel list came from */
export type ListSource = 'demo' | 'places_nearby' | 'manual'

/** Calendar context at decision time (algorithm can weight “quick lunch” vs “weekend explore”). */
export type WeekdayContext = {
  /** `Date.getDay()`: 0 = Sunday … 6 = Saturday */
  dayOfWeek: number
  /** True for Saturday and Sunday */
  isWeekend: boolean
}

/**
 * User comfort with travel distance — separate defaults for weekdays vs weekends.
 * Example: tighter radius on weekdays (quick meal), larger on weekends (worth a walk).
 * Use with `comfortRadiusMeters` when loading Places or filtering candidates.
 */
export type BaseDistancePreference = {
  /** Typical search / max comfortable one-way walk on Mon–Fri */
  weekdayComfortMeters: number
  /** Typical search / max comfortable one-way walk on Sat–Sun */
  weekendComfortMeters: number
}

export const DEFAULT_BASE_DISTANCE: BaseDistancePreference = {
  weekdayComfortMeters: 900,
  weekendComfortMeters: 2200,
}

/** Anonymous correlation id for one “session” (e.g. one evening of swipes). */
export type DiscoverySession = {
  sessionId: string
  startedAt: number
  /** Optional stable client id (e.g. localStorage UUID) for cross-session analytics */
  clientId?: string
  /** Last list source used when session started (optional) */
  listSource?: ListSource
}

/** Append-only record per swipe — supports recomputing aggregates when rules change */
export type DiscoveryEvent = {
  eventId: string
  placeId: string
  /** Display name at decision time (Places names can change) */
  placeNameSnapshot: string
  answer: Answer
  answeredAt: number
  sessionId: string
  /** Zero-based index in the carousel when answered */
  carouselIndex: number
  listSource: ListSource
  /** Radius (m) used for the nearby search that produced this list, if applicable */
  searchRadiusMeters?: number
  weekdayContext: WeekdayContext
}

/** Per-place rollups beyond decision scores — rotation / fairness / CTR-style metrics */
export type PlaceExposureAggregate = {
  placeId: string
  firstSeenAt: number | null
  lastShownAt: number | null
  /** How many times this place was shown in the carousel */
  exposureCount: number
}

export function emptyPlaceExposureAggregate(placeId: string): PlaceExposureAggregate {
  return {
    placeId,
    firstSeenAt: null,
    lastShownAt: null,
    exposureCount: 0,
  }
}

/** Derive weekday vs weekend from a `Date` in local time */
export function getWeekdayContext(date: Date = new Date()): WeekdayContext {
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  return { dayOfWeek, isWeekend }
}

/** Pick the comfort radius that matches weekend vs weekday */
export function comfortRadiusMeters(
  prefs: BaseDistancePreference,
  ctx: WeekdayContext,
): number {
  return ctx.isWeekend ? prefs.weekendComfortMeters : prefs.weekdayComfortMeters
}
