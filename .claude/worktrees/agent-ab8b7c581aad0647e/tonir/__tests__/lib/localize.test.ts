/**
 * Unit tests for src/lib/localize.ts
 *
 * All four functions follow the same 3-level fallback chain for each field:
 *   1. field_<lang>   — requested language
 *   2. field_hy       — Armenian baseline
 *   3. field          — base/legacy column
 *   4. ''             — empty string (or [] for arrays, null for description)
 *
 * Falsy values (empty string, null, undefined) in a higher-priority slot cause
 * the chain to fall through to the next slot.
 *
 * Special case in localizeItem: description uses `|| null` so the empty string
 * fallback becomes null rather than ''.
 */

import { describe, it, expect } from 'vitest'
import { localizeVenue, localizeCategory, localizeItem, localizeGuide } from '@/lib/localize'
import type { Lang } from '@/i18n'

// ─── Minimal stub factories ───────────────────────────────────────────────────
// TypeScript types are erased at runtime; casting as `any` avoids importing the
// full database.types.ts and keeps tests focused on localisation logic.

function makeVenue(fields: Record<string, unknown>) {
  return { id: 'v1', ...fields } as any
}

function makeCat(fields: Record<string, unknown>) {
  return { id: 'c1', ...fields } as any
}

function makeItem(fields: Record<string, unknown>) {
  return { id: 'i1', ...fields } as any
}

function makeGuide(fields: Record<string, unknown>) {
  return { id: 'g1', ...fields } as any
}

// ─────────────────────────────────────────────────────────────────────────────
// localizeVenue
// ─────────────────────────────────────────────────────────────────────────────

describe('localizeVenue — name field fallback chain', () => {
  it('[HAPPY PATH] uses the requested language field when present', () => {
    const v = makeVenue({ name_ru: 'Русский', name_hy: 'Հայ' })
    expect(localizeVenue(v, 'ru').name).toBe('Русский')
  })

  it('[HAPPY PATH] falls back to _hy when the lang-specific field is absent', () => {
    const v = makeVenue({ name_hy: 'Հայ' }) // no name_en
    expect(localizeVenue(v, 'en').name).toBe('Հայ')
  })

  it('[HAPPY PATH] falls back to base field when both lang and _hy are absent', () => {
    const v = makeVenue({ name: 'Base' })
    expect(localizeVenue(v, 'en').name).toBe('Base')
  })

  it('[EDGE CASE] returns empty string when no name field exists at all', () => {
    const v = makeVenue({})
    expect(localizeVenue(v, 'en').name).toBe('')
  })

  it('[EDGE CASE] empty lang field triggers _hy fallback (empty string is falsy)', () => {
    const v = makeVenue({ name_en: '', name_hy: 'Հայ' })
    expect(localizeVenue(v, 'en').name).toBe('Հայ')
  })

  it('[EDGE CASE] null lang field triggers _hy fallback', () => {
    const v = makeVenue({ name_en: null, name_hy: 'Հայ' })
    expect(localizeVenue(v, 'en').name).toBe('Հայ')
  })

  it('[EDGE CASE] empty _hy field triggers base fallback', () => {
    const v = makeVenue({ name_en: '', name_hy: '', name: 'Base' })
    expect(localizeVenue(v, 'en').name).toBe('Base')
  })
})

describe('localizeVenue — tags array field', () => {
  it('[HAPPY PATH] uses lang-specific tags array when present', () => {
    const v = makeVenue({ tags_ru: ['тег1', 'тег2'], tags_hy: ['հայ'] })
    expect(localizeVenue(v, 'ru').tags).toEqual(['тег1', 'тег2'])
  })

  it('[HAPPY PATH] falls back to _hy tags when lang-specific is absent', () => {
    const v = makeVenue({ tags_hy: ['ուտ', 'խմ'] })
    expect(localizeVenue(v, 'en').tags).toEqual(['ուտ', 'խմ'])
  })

  it('[EDGE CASE] returns empty array when no tags field exists', () => {
    const v = makeVenue({})
    expect(localizeVenue(v, 'en').tags).toEqual([])
  })
})

describe('localizeVenue — non-name fields', () => {
  it('[HAPPY PATH] localizes cuisine field', () => {
    const v = makeVenue({ cuisine_en: 'Armenian', cuisine_hy: 'Հայկ.' })
    expect(localizeVenue(v, 'en').cuisine).toBe('Armenian')
  })

  it('[HAPPY PATH] localizes area field', () => {
    const v = makeVenue({ area_ru: 'Центр', area_hy: 'Կենտրոն' })
    expect(localizeVenue(v, 'ru').area).toBe('Центр')
  })

  it('[HAPPY PATH] spreads all original fields onto the returned object', () => {
    const v = makeVenue({ name_hy: 'Test', rating: 4.7, lat: 40.18 })
    const result = localizeVenue(v, 'hy')
    expect((result as any).rating).toBe(4.7)
    expect((result as any).lat).toBe(40.18)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// localizeCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('localizeCategory', () => {
  it('[HAPPY PATH] uses lang-specific name', () => {
    const c = makeCat({ name_en: 'Starters', name_hy: 'Նախուտեստ' })
    expect(localizeCategory(c, 'en').name).toBe('Starters')
  })

  it('[HAPPY PATH] falls back to _hy when lang-specific is absent', () => {
    const c = makeCat({ name_hy: 'Նախուտեստ' })
    expect(localizeCategory(c, 'ru').name).toBe('Նախուտեստ')
  })

  it('[HAPPY PATH] falls back to base name field', () => {
    const c = makeCat({ name: 'Drinks' })
    expect(localizeCategory(c, 'ru').name).toBe('Drinks')
  })

  it('[EDGE CASE] returns empty string when no name field exists', () => {
    const c = makeCat({})
    expect(localizeCategory(c, 'en').name).toBe('')
  })

  it('[HAPPY PATH] spreads original fields (e.g. id, sort_order)', () => {
    const c = makeCat({ name_hy: 'Main', sort_order: 3 })
    const result = localizeCategory(c, 'hy')
    expect((result as any).sort_order).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// localizeItem
// ─────────────────────────────────────────────────────────────────────────────

describe('localizeItem — name and description', () => {
  it('[HAPPY PATH] uses lang-specific name', () => {
    const i = makeItem({ name_ru: 'Хумус', name_hy: 'Հումուս' })
    expect(localizeItem(i, 'ru').name).toBe('Хумус')
  })

  it('[HAPPY PATH] falls back to _hy name', () => {
    const i = makeItem({ name_hy: 'Հումուս' })
    expect(localizeItem(i, 'en').name).toBe('Հումուս')
  })

  it('[HAPPY PATH] uses lang-specific description', () => {
    const i = makeItem({ description_en: 'Creamy', description_hy: 'Կ. հ.' })
    expect(localizeItem(i, 'en').description).toBe('Creamy')
  })

  it('[HAPPY PATH] description falls back to _hy', () => {
    const i = makeItem({ description_hy: 'Կ. հ.' })
    expect(localizeItem(i, 'ru').description).toBe('Կ. հ.')
  })

  it('[EDGE CASE] description is null when no description field exists', () => {
    // l() returns '' → '' || null = null
    const i = makeItem({ name_hy: 'Test' })
    expect(localizeItem(i, 'en').description).toBeNull()
  })

  it('[EDGE CASE] description is null when all description fields are empty string', () => {
    const i = makeItem({ description_en: '', description_hy: '', description: '' })
    expect(localizeItem(i, 'en').description).toBeNull()
  })
})

describe('localizeItem — allergens array', () => {
  it('[HAPPY PATH] uses lang-specific allergens', () => {
    const i = makeItem({ allergens_en: ['gluten', 'dairy'], allergens_hy: ['գլ.'] })
    expect(localizeItem(i, 'en').allergens).toEqual(['gluten', 'dairy'])
  })

  it('[HAPPY PATH] falls back to _hy allergens', () => {
    const i = makeItem({ allergens_hy: ['ounce'] })
    expect(localizeItem(i, 'ru').allergens).toEqual(['ounce'])
  })

  it('[EDGE CASE] returns empty array when no allergens field exists', () => {
    const i = makeItem({ name_hy: 'Test' })
    expect(localizeItem(i, 'en').allergens).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// localizeGuide
// ─────────────────────────────────────────────────────────────────────────────

describe('localizeGuide', () => {
  it('[HAPPY PATH] uses lang-specific title', () => {
    const g = makeGuide({ title_en: 'Wine Bars', title_hy: 'Գինու բ.' })
    expect(localizeGuide(g, 'en').title).toBe('Wine Bars')
  })

  it('[HAPPY PATH] falls back to _hy title', () => {
    const g = makeGuide({ title_hy: 'Գինու բ.' })
    expect(localizeGuide(g, 'ru').title).toBe('Գինու բ.')
  })

  it('[HAPPY PATH] falls back to base title field', () => {
    const g = makeGuide({ title: 'Fallback' })
    expect(localizeGuide(g, 'en').title).toBe('Fallback')
  })

  it('[HAPPY PATH] localizes subtitle and tag fields', () => {
    const g = makeGuide({
      title_hy: 'T',
      subtitle_ru: 'Подзаголовок',
      subtitle_hy: 'Ն.',
      tag_ru: 'ТРЕНД',
      tag_hy: 'Թ.',
    })
    const result = localizeGuide(g, 'ru')
    expect(result.subtitle).toBe('Подзаголовок')
    expect(result.tag).toBe('ТРЕНД')
  })

  it('[EDGE CASE] returns empty strings when no fields exist', () => {
    const g = makeGuide({})
    const result = localizeGuide(g, 'en')
    expect(result.title).toBe('')
    expect(result.subtitle).toBe('')
    expect(result.tag).toBe('')
  })

  it('[HAPPY PATH] hy language uses _hy field directly (no round-trip)', () => {
    const g = makeGuide({ title_hy: 'Մ.', title: 'Base' })
    expect(localizeGuide(g, 'hy').title).toBe('Մ.')
  })
})
