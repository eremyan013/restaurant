/**
 * Unit tests for lib/schemas/yel.schema.ts
 *
 * zYelAdjustSchema validates:
 *   - user_id: must be a valid UUID
 *   - amount: must be a non-zero integer
 *
 * parseYelFormData converts raw FormData into the shape zYelAdjustSchema expects.
 * These are pure unit tests — no mocks needed.
 */

import { describe, it, expect } from 'vitest'
import { zYelAdjustSchema, parseYelFormData } from '@/lib/schemas/yel.schema'

// ─────────────────────────────────────────────────────────────────────────────
// zYelAdjustSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('zYelAdjustSchema', () => {
  // Zod v4 UUID requires version nibble [1-8] and variant nibble [89abAB]
  const VALID_UUID = 'a0000000-0000-4000-8000-000000000001'

  // ── Happy paths ──────────────────────────────────────────────────────────

  it('[HAPPY PATH] valid positive amount (100) with valid user_id → success:true', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: 100 })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(100)
      expect(result.data.user_id).toBe(VALID_UUID)
    }
  })

  it('[HAPPY PATH] valid negative amount (-50) with valid user_id → success:true (negative adjustments allowed)', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: -50 })

    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] amount=-1 (smallest negative) → success:true', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: -1 })

    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] amount=1 (smallest positive) → success:true', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: 1 })

    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] user_id=\'a0000000-0000-4000-8000-000000000001\', amount=500 → success:true', () => {
    const result = zYelAdjustSchema.safeParse({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      amount: 500,
    })

    expect(result.success).toBe(true)
  })

  // ── amount=0 rejection ────────────────────────────────────────────────────

  it('[FAILURE] amount=0 → success:false, issue on path=[\'amount\'], message contains \'zero\'', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: 0 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const amountIssue = result.error.issues.find(i => i.path[0] === 'amount')
      expect(amountIssue).toBeDefined()
      expect(amountIssue?.message).toMatch(/zero/i)
    }
  })

  // ── Integer enforcement ───────────────────────────────────────────────────

  it('[FAILURE] amount=1.5 → success:false, issue on path=[\'amount\'], message contains \'whole number\'', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: 1.5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const amountIssue = result.error.issues.find(i => i.path[0] === 'amount')
      expect(amountIssue).toBeDefined()
      expect(amountIssue?.message).toMatch(/whole number/i)
    }
  })

  it('[FAILURE] amount=-0.5 → success:false', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: VALID_UUID, amount: -0.5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const amountIssue = result.error.issues.find(i => i.path[0] === 'amount')
      expect(amountIssue).toBeDefined()
    }
  })

  // ── user_id UUID enforcement ──────────────────────────────────────────────

  it('[FAILURE] user_id=\'not-uuid\' → success:false, issue on path=[\'user_id\']', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: 'not-uuid', amount: 100 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const userIdIssue = result.error.issues.find(i => i.path[0] === 'user_id')
      expect(userIdIssue).toBeDefined()
    }
  })

  it('[FAILURE] user_id=\'\' → success:false', () => {
    const result = zYelAdjustSchema.safeParse({ user_id: '', amount: 100 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const userIdIssue = result.error.issues.find(i => i.path[0] === 'user_id')
      expect(userIdIssue).toBeDefined()
    }
  })

  it('[FAILURE] user_id missing (undefined) → success:false', () => {
    const result = zYelAdjustSchema.safeParse({ amount: 100 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const userIdIssue = result.error.issues.find(i => i.path[0] === 'user_id')
      expect(userIdIssue).toBeDefined()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseYelFormData
// ─────────────────────────────────────────────────────────────────────────────
describe('parseYelFormData', () => {
  function makeFormData(fields: Record<string, string>): FormData {
    const fd = new FormData()
    for (const [key, val] of Object.entries(fields)) {
      fd.set(key, val)
    }
    return fd
  }

  it('[HAPPY PATH] valid form data → returns { user_id, amount: Number }', () => {
    const fd = makeFormData({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      amount: '250',
    })

    const result = parseYelFormData(fd) as { user_id: string; amount: number }

    expect(result.user_id).toBe('a0000000-0000-4000-8000-000000000001')
    expect(result.amount).toBe(250)
    expect(typeof result.amount).toBe('number')
  })

  it('[EDGE CASE] amount=\'0\' string → returns { amount: 0 } (schema then rejects it)', () => {
    const fd = makeFormData({ user_id: 'a0000000-0000-4000-8000-000000000001', amount: '0' })

    const result = parseYelFormData(fd) as { amount: number }

    // parseYelFormData converts the string to a number — schema validation is separate
    expect(result.amount).toBe(0)

    // Confirm that zYelAdjustSchema then correctly rejects amount=0
    const schemaResult = zYelAdjustSchema.safeParse(result)
    expect(schemaResult.success).toBe(false)
  })

  it('[EDGE CASE] amount=\'abc\' string → returns { amount: NaN } (schema then rejects with int error)', () => {
    const fd = makeFormData({ user_id: 'a0000000-0000-4000-8000-000000000001', amount: 'abc' })

    const result = parseYelFormData(fd) as { amount: number }

    expect(Number.isNaN(result.amount)).toBe(true)

    // zYelAdjustSchema rejects NaN because it is not an integer
    const schemaResult = zYelAdjustSchema.safeParse(result)
    expect(schemaResult.success).toBe(false)
  })

  it('[EDGE CASE] amount=\'\' string → returns { amount: 0 } (Number(\'\') === 0)', () => {
    const fd = makeFormData({ user_id: 'a0000000-0000-4000-8000-000000000001', amount: '' })

    const result = parseYelFormData(fd) as { amount: number }

    // Number('') === 0 in JavaScript
    expect(result.amount).toBe(0)
  })
})
