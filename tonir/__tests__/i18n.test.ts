/**
 * Unit tests for src/i18n.ts
 *
 * These tests validate the structural integrity of the I18N translation tables —
 * they do NOT test the rendering logic in useTranslation (which is a React hook).
 *
 * Coverage:
 *   1. All three languages (hy / ru / en) define the same set of keys.
 *   2. No string value is an empty string in any language.
 *   3. No array value is an empty array in any language.
 *   4. The hy baseline has a meaningful number of keys (regression guard).
 *   5. Spot-checks: specific high-risk keys are present and non-empty in all langs.
 */

import { describe, it, expect } from 'vitest'
import { I18N } from '@/i18n'
import type { Lang } from '@/i18n'

const LANGS: Lang[] = ['hy', 'ru', 'en']

// ─────────────────────────────────────────────────────────────────────────────
// Key completeness across all three languages
// ─────────────────────────────────────────────────────────────────────────────

describe('I18N key completeness', () => {
  const hyKeys = new Set(Object.keys(I18N.hy))
  const ruKeys = new Set(Object.keys(I18N.ru))
  const enKeys = new Set(Object.keys(I18N.en))

  it('[HAPPY PATH] Russian has every key that Armenian has', () => {
    const missing = [...hyKeys].filter(k => !ruKeys.has(k))
    expect(
      missing,
      `Keys present in hy but absent from ru:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })

  it('[HAPPY PATH] English has every key that Armenian has', () => {
    const missing = [...hyKeys].filter(k => !enKeys.has(k))
    expect(
      missing,
      `Keys present in hy but absent from en:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })

  it('[EDGE CASE] Russian does not have extra keys that Armenian lacks', () => {
    const extra = [...ruKeys].filter(k => !hyKeys.has(k))
    expect(
      extra,
      `Keys present in ru but absent from hy:\n  ${extra.join('\n  ')}`
    ).toEqual([])
  })

  it('[EDGE CASE] English does not have extra keys that Armenian lacks', () => {
    const extra = [...enKeys].filter(k => !hyKeys.has(k))
    expect(
      extra,
      `Keys present in en but absent from hy:\n  ${extra.join('\n  ')}`
    ).toEqual([])
  })

  it('[HAPPY PATH] hy baseline has at least 100 keys (sanity / regression guard)', () => {
    expect(hyKeys.size).toBeGreaterThan(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// No empty values in any language
// ─────────────────────────────────────────────────────────────────────────────

for (const lang of LANGS) {
  describe(`I18N[${lang}] — value integrity`, () => {
    it(`[EDGE CASE] no string key maps to an empty string`, () => {
      const empties: string[] = []
      for (const [key, value] of Object.entries(I18N[lang])) {
        if (typeof value === 'string' && value === '') {
          empties.push(key)
        }
      }
      expect(
        empties,
        `I18N.${lang} has empty-string values for: ${empties.join(', ')}`
      ).toEqual([])
    })

    it(`[EDGE CASE] no array key has an empty array`, () => {
      const empties: string[] = []
      for (const [key, value] of Object.entries(I18N[lang])) {
        if (Array.isArray(value) && value.length === 0) {
          empties.push(key)
        }
      }
      expect(
        empties,
        `I18N.${lang} has empty arrays for: ${empties.join(', ')}`
      ).toEqual([])
    })

    it(`[EDGE CASE] no value is null or undefined`, () => {
      const nullish: string[] = []
      for (const [key, value] of Object.entries(I18N[lang])) {
        if (value == null) nullish.push(key)
      }
      expect(
        nullish,
        `I18N.${lang} has null/undefined values for: ${nullish.join(', ')}`
      ).toEqual([])
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Spot-checks for high-risk keys used across screens
// ─────────────────────────────────────────────────────────────────────────────

describe('I18N spot-checks', () => {
  // Auth keys — missing translations here break the sign-in/sign-up flow
  for (const lang of LANGS) {
    it(`[HAPPY PATH] [${lang}] auth screen keys are present and non-empty`, () => {
      const authKeys = [
        'auth_signin', 'auth_signup', 'auth_submit_signin', 'auth_submit_signup',
        'auth_err_fields', 'auth_err_invalid', 'auth_err_exists',
      ]
      for (const key of authKeys) {
        expect(I18N[lang][key], `I18N.${lang}.${key} is missing or empty`).toBeTruthy()
      }
    })
  }

  // Booking screen keys — critical for core reservation flow
  for (const lang of LANGS) {
    it(`[HAPPY PATH] [${lang}] booking screen keys are present`, () => {
      const bookKeys = [
        'book_cta', 'book_people', 'book_date', 'book_time',
        'book_closed', 'book_days', 'book_months',
      ]
      for (const key of bookKeys) {
        const val = I18N[lang][key]
        expect(val, `I18N.${lang}.${key} is missing`).toBeDefined()
        if (Array.isArray(val)) {
          expect(val.length, `I18N.${lang}.${key} is empty array`).toBeGreaterThan(0)
        } else {
          expect(val, `I18N.${lang}.${key} is empty`).toBeTruthy()
        }
      }
    })
  }

  // book_days must have exactly 7 entries (Sun–Sat abbreviations)
  for (const lang of LANGS) {
    it(`[EDGE CASE] [${lang}] book_days has exactly 7 entries`, () => {
      const days = I18N[lang]['book_days']
      expect(Array.isArray(days)).toBe(true)
      expect((days as string[]).length).toBe(7)
    })
  }

  // book_months must have exactly 12 entries
  for (const lang of LANGS) {
    it(`[EDGE CASE] [${lang}] book_months has exactly 12 entries`, () => {
      const months = I18N[lang]['book_months']
      expect(Array.isArray(months)).toBe(true)
      expect((months as string[]).length).toBe(12)
    })
  }

  // prof_tier_names must have exactly 4 entries
  for (const lang of LANGS) {
    it(`[EDGE CASE] [${lang}] prof_tier_names has exactly 4 tier labels`, () => {
      const tiers = I18N[lang]['prof_tier_names']
      expect(Array.isArray(tiers)).toBe(true)
      expect((tiers as string[]).length).toBe(4)
    })
  }

  // Template strings must include expected placeholders
  it('[HAPPY PATH] res_stat (hy) contains {yel} and {visits} placeholders', () => {
    const s = I18N.hy['res_stat'] as string
    expect(s).toContain('{yel}')
    expect(s).toContain('{visits}')
  })

  it('[HAPPY PATH] trf placeholder {n} present in market_pts_cost across all langs', () => {
    for (const lang of LANGS) {
      const s = I18N[lang]['market_pts_cost'] as string
      expect(s, `I18N.${lang}.market_pts_cost missing {n}`).toContain('{n}')
    }
  })

  it('[HAPPY PATH] srch_filters array has ≥ 4 entries in all languages', () => {
    for (const lang of LANGS) {
      const filters = I18N[lang]['srch_filters'] as string[]
      expect(filters.length).toBeGreaterThanOrEqual(4)
    }
  })
})
