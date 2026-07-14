import { describe, it, expect } from 'vitest'
import { calcTierLevel, genYelCode } from '@/lib/yel-logic'

const DEFAULT_MINS: Record<number, number> = { 1: 0, 2: 1000, 3: 2000, 4: 3000 }

describe('calcTierLevel()', () => {
  it('[HAPPY PATH] returns 1 for 0 points', () => {
    expect(calcTierLevel(0, DEFAULT_MINS)).toBe(1)
  })
  it('[HAPPY PATH] returns 1 for points below tier 2 threshold', () => {
    expect(calcTierLevel(999, DEFAULT_MINS)).toBe(1)
  })
  it('[HAPPY PATH] returns 2 at exact tier 2 minimum (1000)', () => {
    expect(calcTierLevel(1000, DEFAULT_MINS)).toBe(2)
  })
  it('[HAPPY PATH] returns 2 for points between tier 2 and 3', () => {
    expect(calcTierLevel(1500, DEFAULT_MINS)).toBe(2)
  })
  it('[HAPPY PATH] returns 2 for one point below tier 3 (1999)', () => {
    expect(calcTierLevel(1999, DEFAULT_MINS)).toBe(2)
  })
  it('[HAPPY PATH] returns 3 at exact tier 3 minimum (2000)', () => {
    expect(calcTierLevel(2000, DEFAULT_MINS)).toBe(3)
  })
  it('[HAPPY PATH] returns 3 for points between tier 3 and 4', () => {
    expect(calcTierLevel(2500, DEFAULT_MINS)).toBe(3)
  })
  it('[HAPPY PATH] returns 3 for one point below tier 4 (2999)', () => {
    expect(calcTierLevel(2999, DEFAULT_MINS)).toBe(3)
  })
  it('[HAPPY PATH] returns 4 at exact tier 4 minimum (3000)', () => {
    expect(calcTierLevel(3000, DEFAULT_MINS)).toBe(4)
  })
  it('[HAPPY PATH] returns 4 for points well above tier 4', () => {
    expect(calcTierLevel(99999, DEFAULT_MINS)).toBe(4)
  })
  it('[HAPPY PATH] respects custom thresholds', () => {
    const c = { 1: 0, 2: 500, 3: 1500, 4: 5000 }
    expect(calcTierLevel(499,  c)).toBe(1)
    expect(calcTierLevel(500,  c)).toBe(2)
    expect(calcTierLevel(1499, c)).toBe(2)
    expect(calcTierLevel(1500, c)).toBe(3)
    expect(calcTierLevel(4999, c)).toBe(3)
    expect(calcTierLevel(5000, c)).toBe(4)
  })
  it('[EDGE CASE] returns 1 for negative points', () => {
    expect(calcTierLevel(-1, DEFAULT_MINS)).toBe(1)
  })
  it('[EDGE CASE] when all thresholds are 0, highest tier wins (waterfall checks 4 first)', () => {
    expect(calcTierLevel(0, { 1: 0, 2: 0, 3: 0, 4: 0 })).toBe(4)
  })
})

describe('genYelCode()', () => {
  it('[HAPPY PATH] matches format YEL-XXXXXX', () => {
    expect(genYelCode()).toMatch(/^YEL-[A-Z0-9]{6}$/)
  })
  it('[HAPPY PATH] always starts with YEL-', () => {
    for (let i = 0; i < 20; i++) expect(genYelCode()).toMatch(/^YEL-/)
  })
  it('[HAPPY PATH] suffix is exactly 6 characters', () => {
    expect(genYelCode().slice(4)).toHaveLength(6)
  })
  it('[HAPPY PATH] suffix contains only uppercase alphanumeric chars', () => {
    for (let i = 0; i < 50; i++) expect(genYelCode().slice(4)).toMatch(/^[A-Z0-9]+$/)
  })
  it('[HAPPY PATH] generates distinct codes across 100 calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => genYelCode()))
    expect(codes.size).toBeGreaterThan(95)
  })
})
