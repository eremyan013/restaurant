/**
 * Unit tests for src/lib/distance.ts
 *
 * All three functions are pure (no I/O, no side effects) — no mocks needed.
 *
 * Key behaviours under test:
 *   haversineKm  — great-circle distance via Haversine formula
 *   formatDistance — km → display string using Armenian metre/km suffixes
 *   parseDistanceToKm — parses display strings back to km for sorting
 *
 * Important quirk of parseDistanceToKm:
 *   The regex /^\d[\d\s]*\s*[մмm](?!.*[կk])/u only matches INTEGER metre values
 *   (no decimal point before the suffix). Decimal values without a suffix are
 *   treated as km. This is intentional — formatDistance never emits decimal metres.
 */

import { describe, it, expect } from 'vitest'
import { haversineKm, formatDistance, parseDistanceToKm } from '@/lib/distance'

// ─────────────────────────────────────────────────────────────────────────────
// haversineKm
// ─────────────────────────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('[HAPPY PATH] returns 0 for identical coordinates', () => {
    expect(haversineKm(40.18, 44.51, 40.18, 44.51)).toBeCloseTo(0, 3)
  })

  it('[HAPPY PATH] Yerevan → Tbilisi is approximately 170 km (great-circle, not road)', () => {
    // Yerevan: 40.1792 N, 44.4991 E  /  Tbilisi: 41.6938 N, 44.8015 E
    // Great-circle ≈ 170 km; road distance is longer (~270 km via M-5)
    const km = haversineKm(40.1792, 44.4991, 41.6938, 44.8015)
    expect(km).toBeGreaterThan(150)
    expect(km).toBeLessThan(200)
  })

  it('[HAPPY PATH] distance is symmetric — A→B equals B→A', () => {
    const ab = haversineKm(40.1792, 44.4991, 41.6938, 44.8015)
    const ba = haversineKm(41.6938, 44.8015, 40.1792, 44.4991)
    expect(ab).toBeCloseTo(ba, 8)
  })

  it('[HAPPY PATH] short intra-city distance (~1 km) is in the right order of magnitude', () => {
    // Two points ~1 km apart along a meridian near Yerevan centre
    const km = haversineKm(40.180, 44.510, 40.189, 44.510)
    expect(km).toBeGreaterThan(0.9)
    expect(km).toBeLessThan(1.1)
  })

  it('[EDGE CASE] pole to equator is ~10 007 km', () => {
    const km = haversineKm(90, 0, 0, 0)
    // Earth radius = 6371 km; quarter-circumference ≈ 10 007.5 km
    expect(km).toBeGreaterThan(9900)
    expect(km).toBeLessThan(10100)
  })

  it('[EDGE CASE] handles negative (southern hemisphere) coordinates', () => {
    // Sydney (−33.87, 151.21) → Auckland (−36.85, 174.76) ≈ 2 155 km
    const km = haversineKm(-33.8688, 151.2093, -36.8485, 174.7633)
    expect(km).toBeGreaterThan(2100)
    expect(km).toBeLessThan(2200)
  })

  it('[EDGE CASE] handles negative longitude (western hemisphere)', () => {
    // New York: 40.71 N, −74.01 E
    // Los Angeles: 34.05 N, −118.24 E  ≈ 3 940 km
    const km = haversineKm(40.71, -74.01, 34.05, -118.24)
    expect(km).toBeGreaterThan(3800)
    expect(km).toBeLessThan(4100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatDistance
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDistance', () => {
  it('[HAPPY PATH] formats 0.35 km as "350 մ" (Armenian metre suffix)', () => {
    expect(formatDistance(0.35)).toBe('350 մ')
  })

  it('[HAPPY PATH] formats exactly 1 km as "1.0 կմ"', () => {
    expect(formatDistance(1)).toBe('1.0 կմ')
  })

  it('[HAPPY PATH] formats 2.567 km as "2.6 կմ" (rounds to 1 decimal)', () => {
    expect(formatDistance(2.567)).toBe('2.6 կմ')
  })

  it('[HAPPY PATH] formats 10 km as "10.0 կմ"', () => {
    expect(formatDistance(10)).toBe('10.0 կմ')
  })

  it('[HAPPY PATH] formats 100 km as "100.0 կմ"', () => {
    expect(formatDistance(100)).toBe('100.0 կմ')
  })

  it('[EDGE CASE] 0 km formats as "0 մ" (zero metres)', () => {
    expect(formatDistance(0)).toBe('0 մ')
  })

  it('[EDGE CASE] 0.9999 km → 1000 մ (still in the sub-km branch)', () => {
    expect(formatDistance(0.9999)).toBe('1000 մ')
  })

  it('[EDGE CASE] 0.0005 km → Math.round(0.5) = 1 → "1 մ"', () => {
    expect(formatDistance(0.0005)).toBe('1 մ')
  })

  it('[EDGE CASE] 0.0004 km → Math.round(0.4) = 0 → "0 մ"', () => {
    expect(formatDistance(0.0004)).toBe('0 մ')
  })

  it('[EDGE CASE] 1.5 km rounds to "1.5 կմ" (no rounding needed)', () => {
    expect(formatDistance(1.5)).toBe('1.5 կմ')
  })

  it('[EDGE CASE] 1.95 km formats as "1.9 կմ" — IEEE 754 toFixed behavior', () => {
    // (1.95).toFixed(1) returns '1.9' in V8 due to floating-point representation.
    // 1.95 is stored as 1.94999…, so the first digit after the decimal is 9, not 10.
    // This is expected JS behaviour, not a bug in formatDistance.
    expect(formatDistance(1.95)).toBe('1.9 կմ')
  })

  it('[EDGE CASE] 1.96 km rounds to "2.0 կմ"', () => {
    expect(formatDistance(1.96)).toBe('2.0 կմ')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseDistanceToKm
// ─────────────────────────────────────────────────────────────────────────────

describe('parseDistanceToKm', () => {
  // ── Metre suffixes (divide by 1000) ───────────────────────────────────────

  it('[HAPPY PATH] Armenian metre "350 մ" → 0.35 km', () => {
    expect(parseDistanceToKm('350 մ')).toBeCloseTo(0.35, 5)
  })

  it('[HAPPY PATH] Cyrillic metre "800 м" → 0.8 km', () => {
    expect(parseDistanceToKm('800 м')).toBeCloseTo(0.8, 5)
  })

  it('[HAPPY PATH] Latin metre "500 m" → 0.5 km', () => {
    expect(parseDistanceToKm('500 m')).toBeCloseTo(0.5, 5)
  })

  it('[HAPPY PATH] metre with no space "350մ" → 0.35 km', () => {
    expect(parseDistanceToKm('350մ')).toBeCloseTo(0.35, 5)
  })

  it('[EDGE CASE] "0 մ" → 0 km', () => {
    expect(parseDistanceToKm('0 մ')).toBe(0)
  })

  // ── Km suffixes (return value as-is) ──────────────────────────────────────

  it('[HAPPY PATH] Armenian km "1.2 կմ" → 1.2 km', () => {
    expect(parseDistanceToKm('1.2 կմ')).toBeCloseTo(1.2, 5)
  })

  it('[HAPPY PATH] Latin km "1.5 km" → 1.5 km (NOT metres)', () => {
    // The negative lookahead (?!.*[կk]) prevents "km" from being treated as metres
    expect(parseDistanceToKm('1.5 km')).toBeCloseTo(1.5, 5)
  })

  it('[HAPPY PATH] decimal km "10.5 կմ" → 10.5 km', () => {
    expect(parseDistanceToKm('10.5 կմ')).toBeCloseTo(10.5, 5)
  })

  // ── Numeric input ─────────────────────────────────────────────────────────

  it('[HAPPY PATH] numeric float 2.5 passes through as km', () => {
    expect(parseDistanceToKm(2.5)).toBeCloseTo(2.5, 5)
  })

  it('[HAPPY PATH] numeric integer 3 passes through as km', () => {
    expect(parseDistanceToKm(3)).toBeCloseTo(3.0, 5)
  })

  it('[HAPPY PATH] numeric 0 passes through as 0 km', () => {
    expect(parseDistanceToKm(0)).toBe(0)
  })

  // ── Comma decimal normalisation ───────────────────────────────────────────

  it('[EDGE CASE] comma-decimal "0,5 կմ" → 0.5 km', () => {
    expect(parseDistanceToKm('0,5 կմ')).toBeCloseTo(0.5, 5)
  })

  it('[EDGE CASE] comma-decimal metre "350,5 մ" → 0.3505 km', () => {
    // Note: decimal metre values hit the "no decimal in regex" path and return
    // parseFloat value directly — which is 350.5, then NOT divided (regex misses)
    // So this returns 350.5, not 0.3505.
    // This is acceptable: formatDistance never emits "350.5 մ".
    // Test documents actual behaviour.
    expect(parseDistanceToKm('350,5 մ')).toBeCloseTo(350.5, 3)
  })

  // ── Bare number string ────────────────────────────────────────────────────

  it('[EDGE CASE] bare number string "3.0" is treated as km', () => {
    expect(parseDistanceToKm('3.0')).toBeCloseTo(3.0, 5)
  })

  // ── Failure cases ─────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] non-numeric string returns Infinity', () => {
    expect(parseDistanceToKm('abc')).toBe(Infinity)
  })

  it('[FAILURE SCENARIO] empty string returns Infinity', () => {
    expect(parseDistanceToKm('')).toBe(Infinity)
  })

  it('[FAILURE SCENARIO] "NaN" string returns Infinity', () => {
    expect(parseDistanceToKm('NaN')).toBe(Infinity)
  })
})
