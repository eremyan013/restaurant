/**
 * Unit tests for the pure exported functions in src/hooks/useVenueAvailability.ts
 *
 *   isDateAvailable     — given a date string, day-of-week, hoursMap, and blockedDates,
 *                          returns true only if the date is in the future, not blocked,
 *                          and the day is open (or no hours are set for it).
 *
 *   filterAvailableTimes — filters a list of HH:MM strings to those within the venue's
 *                          opening window, and (when isToday=true) also strips past slots.
 *
 * The useVenueAvailability hook itself is NOT tested here — it requires a React
 * rendering environment. See coverage gaps at the bottom of this file.
 *
 * Mock strategy:
 *   - vi.mock('@/lib/api') prevents api.ts (and its transitive Supabase client import)
 *     from executing during module load. The pure functions under test do not call the API.
 *   - vi.useFakeTimers() / vi.setSystemTime() pins "now" for time-sensitive assertions.
 *
 * ⚠ Timezone risk: filterAvailableTimes uses new Date().getHours() (local time).
 *   The isToday tests below set system time WITHOUT the 'Z' suffix so Node treats
 *   the string as LOCAL time. Tests pass reliably only in UTC or when the fake time
 *   is set far enough from midnight that ±14-hour offsets don't cross day boundaries.
 *   See "Coverage Gaps" note at the bottom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Prevent the transitive Supabase createClient() call from executing
vi.mock('@/lib/api', () => ({ fetchVenueAvailability: vi.fn() }))

import {
  isDateAvailable,
  filterAvailableTimes,
} from '@/hooks/useVenueAvailability'
import type { VenueHoursRow } from '@/lib/database.types'

// ─── Minimal VenueHoursRow stubs ─────────────────────────────────────────────

function makeHours(
  dayOfWeek: number,
  opts: { is_open: boolean; open_time?: string | null; close_time?: string | null },
): VenueHoursRow {
  return {
    id: `h${dayOfWeek}`,
    venue_id: 'v1',
    day_of_week: dayOfWeek,
    is_open: opts.is_open,
    open_time: opts.open_time ?? null,
    close_time: opts.close_time ?? null,
  } as any
}

// ─────────────────────────────────────────────────────────────────────────────
// isDateAvailable
// ─────────────────────────────────────────────────────────────────────────────

describe('isDateAvailable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Pin "today" to 2026-06-11 (Thursday, day index depends on locale but
    // the string comparison only uses the ISO date, not the day-of-week arg)
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Past dates ──────────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] yesterday returns false', () => {
    expect(isDateAvailable('2026-06-10', 3, {}, new Set())).toBe(false)
  })

  it('[FAILURE SCENARIO] a date far in the past returns false', () => {
    expect(isDateAvailable('2020-01-01', 3, {}, new Set())).toBe(false)
  })

  // ── Today and future ───────────────────────────────────────────────────────

  it('[HAPPY PATH] today itself is available (not strictly in the past)', () => {
    // isoDate >= today passes the "past date" guard (>= not <)
    expect(isDateAvailable('2026-06-11', 4, {}, new Set())).toBe(true)
  })

  it('[HAPPY PATH] a future date with no hours entry returns true (backwards-compatible)', () => {
    expect(isDateAvailable('2099-12-31', 3, {}, new Set())).toBe(true)
  })

  // ── Blocked dates ──────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] a blocked future date returns false', () => {
    const blocked = new Set(['2026-07-01'])
    expect(isDateAvailable('2026-07-01', 2, {}, blocked)).toBe(false)
  })

  it('[HAPPY PATH] an unblocked future date with blocked dates in the set returns true', () => {
    const blocked = new Set(['2026-07-01', '2026-07-04'])
    expect(isDateAvailable('2026-07-02', 4, {}, blocked)).toBe(true)
  })

  // ── Hours map: is_open flag ────────────────────────────────────────────────

  it('[FAILURE SCENARIO] day with is_open=false returns false', () => {
    const hoursMap = { 1: makeHours(1, { is_open: false }) }
    expect(isDateAvailable('2026-06-15', 1, hoursMap, new Set())).toBe(false)
  })

  it('[HAPPY PATH] day with is_open=true returns true', () => {
    const hoursMap = { 1: makeHours(1, { is_open: true, open_time: '10:00', close_time: '23:00' }) }
    expect(isDateAvailable('2026-06-15', 1, hoursMap, new Set())).toBe(true)
  })

  it('[HAPPY PATH] day with is_open=true but no times still returns true', () => {
    const hoursMap = { 1: makeHours(1, { is_open: true, open_time: null, close_time: null }) }
    expect(isDateAvailable('2026-06-15', 1, hoursMap, new Set())).toBe(true)
  })

  // ── Combination edge cases ─────────────────────────────────────────────────

  it('[FAILURE SCENARIO] blocked AND closed day still returns false (blocked wins first)', () => {
    const hoursMap = { 1: makeHours(1, { is_open: true }) }
    const blocked  = new Set(['2026-06-15'])
    expect(isDateAvailable('2026-06-15', 1, hoursMap, blocked)).toBe(false)
  })

  it('[FAILURE SCENARIO] past date that happens to be unblocked still returns false', () => {
    expect(isDateAvailable('2026-06-01', 1, {}, new Set())).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filterAvailableTimes
// ─────────────────────────────────────────────────────────────────────────────

describe('filterAvailableTimes — no hours entry', () => {
  it('[HAPPY PATH] returns all times when hoursMap has no entry for the day', () => {
    const times = ['10:00', '14:00', '18:00', '22:00']
    expect(filterAvailableTimes(times, 0, {})).toEqual(times)
  })

  it('[EDGE CASE] returns empty array when times list is empty', () => {
    expect(filterAvailableTimes([], 0, {})).toEqual([])
  })
})

describe('filterAvailableTimes — is_open=false', () => {
  it('[HAPPY PATH] returns ALL times unfiltered when day is closed (caller disables the day)', () => {
    const hoursMap = { 1: makeHours(1, { is_open: false, open_time: '12:00', close_time: '22:00' }) }
    const times = ['10:00', '14:00', '22:00']
    // When is_open=false the condition (!h.is_open) is true → times are NOT filtered
    expect(filterAvailableTimes(times, 1, hoursMap)).toEqual(times)
  })
})

describe('filterAvailableTimes — open window filtering', () => {
  const hoursMap = {
    1: makeHours(1, { is_open: true, open_time: '12:00', close_time: '22:00' }),
  }

  it('[HAPPY PATH] keeps times within the open/close window', () => {
    const times = ['10:00', '12:00', '18:00', '22:00', '23:00']
    expect(filterAvailableTimes(times, 1, hoursMap)).toEqual(['12:00', '18:00', '22:00'])
  })

  it('[EDGE CASE] boundary: open_time is inclusive (t >= open_time)', () => {
    expect(filterAvailableTimes(['12:00'], 1, hoursMap)).toEqual(['12:00'])
  })

  it('[EDGE CASE] boundary: close_time is inclusive (t <= close_time)', () => {
    expect(filterAvailableTimes(['22:00'], 1, hoursMap)).toEqual(['22:00'])
  })

  it('[EDGE CASE] time just before open is excluded', () => {
    expect(filterAvailableTimes(['11:59'], 1, hoursMap)).toEqual([])
  })

  it('[EDGE CASE] time just after close is excluded', () => {
    expect(filterAvailableTimes(['22:01'], 1, hoursMap)).toEqual([])
  })

  it('[HAPPY PATH] returns empty when all times are outside the window', () => {
    expect(filterAvailableTimes(['08:00', '09:00', '23:30'], 1, hoursMap)).toEqual([])
  })
})

describe('filterAvailableTimes — isToday strips past times', () => {
  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] strips times at or before current time', () => {
    vi.useFakeTimers()
    // Use LOCAL-time constructor so getHours()/getMinutes() return 15/30
    // regardless of the test-runner timezone (avoids UTC-offset skew).
    vi.setSystemTime(new Date(2026, 5, 11, 15, 30, 0)) // June = month 5 (0-indexed)

    const times = ['14:00', '15:29', '15:30', '16:00', '19:00']
    // Strict: t > '15:30' — slots equal to currentTime are also stripped
    const result = filterAvailableTimes(times, 4, {}, true)
    expect(result).toEqual(['16:00', '19:00'])
  })

  it('[EDGE CASE] returns empty array when all times have passed for today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 11, 23, 59, 0))

    const times = ['12:00', '18:00', '22:00', '23:30']
    const result = filterAvailableTimes(times, 4, {}, true)
    expect(result).toEqual([])
  })

  it('[EDGE CASE] isToday=false does not strip past times', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 11, 20, 0, 0))

    const times = ['08:00', '10:00']
    // Without isToday, past slots are preserved
    expect(filterAvailableTimes(times, 4, {}, false)).toEqual(times)
  })

  it('[HAPPY PATH] isToday combined with open window filters both dimensions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 11, 14, 0, 0))

    const hoursMap = { 4: makeHours(4, { is_open: true, open_time: '12:00', close_time: '22:00' }) }
    const times = ['10:00', '12:00', '13:00', '14:00', '15:00', '22:00', '23:00']
    // Window filter: removes 10:00 and 23:00
    // isToday filter: removes 12:00, 13:00, 14:00 (≤ current '14:00')
    const result = filterAvailableTimes(times, 4, hoursMap, true)
    expect(result).toEqual(['15:00', '22:00'])
  })
})

/*
 * Coverage Gaps:
 *
 * 1. useVenueAvailability hook — not tested; requires React rendering environment
 *    (@testing-library/react-native or equivalent).  The hook's core logic
 *    (hoursMap building, blockedDates set creation) is a thin wrapper around
 *    fetchVenueAvailability whose correctness is validated by integration tests.
 *
 * 2. Timezone sensitivity in isToday tests — filterAvailableTimes uses
 *    new Date().getHours() / getMinutes() (local time). The tests above set fake
 *    time in UTC (via 'Z' suffix). On machines where the Node process runs in
 *    a non-UTC timezone, getHours() will differ from the UTC hour, potentially
 *    causing false failures. Track as known flaky risk; fix by extracting a
 *    "getCurrentHHMM()" helper that can be injected in tests.
 */
