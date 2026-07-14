/**
 * Unit tests for src/theme.ts
 *
 * Covers:
 *   makeTheme  — constructs a Theme by merging palette tokens with light/dark layout tokens
 *   heatColor  — maps HeatLevel to the correct theme token
 *
 * Both functions are pure; no mocks required.
 */

import { describe, it, expect } from 'vitest'
import { makeTheme, heatColor, PALETTES } from '@/theme'

// ─────────────────────────────────────────────────────────────────────────────
// makeTheme
// ─────────────────────────────────────────────────────────────────────────────

describe('makeTheme — palette selection', () => {
  it('[HAPPY PATH] default (green, light) has correct brand colours', () => {
    const t = makeTheme()
    expect(t.primary).toBe('#1F4D3E')
    expect(t.primaryDeep).toBe('#14352A')
    expect(t.accent).toBe('#C9A961')
    expect(t.pop).toBe('#E8743B')
  })

  it('[HAPPY PATH] red palette changes primary and accent colours', () => {
    const t = makeTheme('red')
    expect(t.primary).toBe('#B0223A')
    expect(t.primaryDeep).toBe('#7A1729')
    expect(t.accent).toBe('#E8A93B')
    expect(t.pop).toBe('#1F4D3E')
  })

  it('[HAPPY PATH] terracotta palette has correct tokens', () => {
    const t = makeTheme('terracotta')
    expect(t.primary).toBe('#B85C38')
    expect(t.primaryDeep).toBe('#7A3A20')
    expect(t.accent).toBe('#3E5C4A')
    expect(t.pop).toBe('#C9A961')
  })

  it('[HAPPY PATH] navy palette has correct primaryDeep', () => {
    const t = makeTheme('navy')
    expect(t.primary).toBe('#1A2B4A')
    expect(t.primaryDeep).toBe('#0E1A30')
  })

  it('[EDGE CASE] palette tokens match the PALETTES constant exactly', () => {
    for (const [name, pal] of Object.entries(PALETTES) as [any, any][]) {
      const t = makeTheme(name, false)
      expect(t.primary).toBe(pal.primary)
      expect(t.primaryDeep).toBe(pal.primaryDeep)
      expect(t.accent).toBe(pal.accent)
      expect(t.pop).toBe(pal.pop)
    }
  })
})

describe('makeTheme — light mode layout tokens', () => {
  it('[HAPPY PATH] light mode uses warm background', () => {
    const t = makeTheme('green', false)
    expect(t.bg).toBe('#F5EFE3')
    expect(t.bgAlt).toBe('#EDE7D9')
    expect(t.surface).toBe('#FFFFFF')
    expect(t.surfaceAlt).toBe('#FAF6EC')
  })

  it('[HAPPY PATH] light mode uses dark text', () => {
    const t = makeTheme('green', false)
    expect(t.text).toBe('#1A1A1A')
    expect(t.textMute).toBe('#6B6B6B')
    expect(t.textFaint).toBe('#9A9A9A')
  })

  it('[HAPPY PATH] dark flag is false in light mode', () => {
    expect(makeTheme('green', false).dark).toBe(false)
    expect(makeTheme().dark).toBe(false) // default
  })
})

describe('makeTheme — dark mode layout tokens', () => {
  it('[HAPPY PATH] dark mode uses deep background', () => {
    const t = makeTheme('green', true)
    expect(t.bg).toBe('#0E1A16')
    expect(t.bgAlt).toBe('#13201B')
    expect(t.surface).toBe('#1A2924')
    expect(t.surfaceAlt).toBe('#22332D')
  })

  it('[HAPPY PATH] dark mode uses light text', () => {
    const t = makeTheme('green', true)
    expect(t.text).toBe('#F2EBDA')
    expect(t.textMute).toBe('#A8B0AB')
    expect(t.textFaint).toBe('#717A75')
  })

  it('[HAPPY PATH] dark flag is true in dark mode', () => {
    expect(makeTheme('green', true).dark).toBe(true)
  })

  it('[EDGE CASE] dark surface differs from light surface', () => {
    const light = makeTheme('green', false)
    const dark  = makeTheme('green', true)
    expect(dark.surface).not.toBe(light.surface)
  })

  it('[EDGE CASE] dark mode overrides layout tokens but keeps palette tokens', () => {
    const t = makeTheme('red', true)
    // Layout tokens — dark
    expect(t.bg).toBe('#0E1A16')
    // Palette tokens — red
    expect(t.primary).toBe('#B0223A')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// heatColor
// ─────────────────────────────────────────────────────────────────────────────

describe('heatColor', () => {
  const theme = makeTheme() // green / light

  it('[HAPPY PATH] "high" maps to theme.pop', () => {
    expect(heatColor('high', theme)).toBe(theme.pop)
  })

  it('[HAPPY PATH] "med" maps to theme.accent', () => {
    expect(heatColor('med', theme)).toBe(theme.accent)
  })

  it('[HAPPY PATH] "low" maps to theme.textMute', () => {
    expect(heatColor('low', theme)).toBe(theme.textMute)
  })

  it('[EDGE CASE] each heat level produces a different colour', () => {
    const high = heatColor('high', theme)
    const med  = heatColor('med', theme)
    const low  = heatColor('low', theme)
    expect(high).not.toBe(med)
    expect(med).not.toBe(low)
    expect(high).not.toBe(low)
  })

  it('[EDGE CASE] colour changes when theme palette changes', () => {
    const greenTheme = makeTheme('green')
    const redTheme   = makeTheme('red')
    // Both palettes have different accent/pop colours
    expect(heatColor('high', greenTheme)).not.toBe(heatColor('high', redTheme))
  })
})
