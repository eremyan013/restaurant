import { describe, it, expect } from 'vitest'
import { zPrizeSchema, parsePrizeFormData } from '@/lib/schemas/prize.schema'

const VALID_VENUE_UUID = 'b0000000-0000-4000-a000-000000000001'

// Minimal valid input for reuse across tests
const BASE = {
  name: 'Happy Hour Discount',
  type: 'discount' as const,
  unlock_type: 'points' as const,
  points_cost: 100,
  sort_order: 0,
  is_active: true,
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

describe('zPrizeSchema', () => {
  describe('name', () => {
    it('[HAPPY PATH] valid name → success', () => {
      const result = zPrizeSchema.safeParse(BASE)
      expect(result.success).toBe(true)
    })

    it("[FAILURE] name='' → success:false, issue on path ['name']", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'name')).toBe(true)
      }
    })

    it('[FAILURE] name missing (undefined) → success:false', () => {
      const { name: _name, ...rest } = BASE
      const result = zPrizeSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })

  describe('type enum', () => {
    it("[HAPPY PATH] type='discount' → success", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, type: 'discount' })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] type='free_item' → success", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, type: 'free_item' })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] type='experience' → success", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, type: 'experience' })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] type='voucher' → success", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, type: 'voucher' })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] type='unknown' → success:false", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, type: 'unknown' })
      expect(result.success).toBe(false)
    })
  })

  describe('unlock_type: points — superRefine cross-field rule', () => {
    it("[HAPPY PATH] unlock_type='points', points_cost=100 → success", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: 100 })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] unlock_type='points', points_cost=1 → success (minimum positive)", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: 1 })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] unlock_type='points', points_cost=null → success:false, issue on path ['points_cost'], message contains 'required'", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: null })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path[0] === 'points_cost')
        expect(issue).toBeDefined()
        expect(issue?.message).toMatch(/required/i)
      }
    })

    it('[FAILURE] unlock_type=\'points\', points_cost=undefined → success:false (undefined triggers superRefine missing check)', () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: undefined })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path[0] === 'points_cost')
        expect(issue).toBeDefined()
        expect(issue?.message).toMatch(/required/i)
      }
    })

    it("[FAILURE] unlock_type='points', points_cost=0 → success:false (z.number().positive() rejects 0)", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: 0 })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] unlock_type='points', points_cost=-1 → success:false (not positive)", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: -1 })
      expect(result.success).toBe(false)
    })
  })

  describe('unlock_type: tier — superRefine cross-field rule', () => {
    it("[HAPPY PATH] unlock_type='tier', min_tier_level=1 → success", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: null,
        min_tier_level: 1,
      })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] unlock_type='tier', min_tier_level=4 → success (max)", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: null,
        min_tier_level: 4,
      })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] unlock_type='tier', min_tier_level=null → success:false, issue on path ['min_tier_level'], message contains 'required'", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: null,
        min_tier_level: null,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path[0] === 'min_tier_level')
        expect(issue).toBeDefined()
        expect(issue?.message).toMatch(/required/i)
      }
    })

    it("[FAILURE] unlock_type='tier', min_tier_level=0 → success:false (z.number().int().min(1) rejects 0)", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: null,
        min_tier_level: 0,
      })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] unlock_type='tier', min_tier_level=5 → success:false (above max(4))", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: null,
        min_tier_level: 5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('cross-field orthogonality', () => {
    it("[EDGE CASE] unlock_type='points', min_tier_level=2 → success (tier field is optional, irrelevant)", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, unlock_type: 'points', points_cost: 50, min_tier_level: 2 })
      expect(result.success).toBe(true)
    })

    it("[EDGE CASE] unlock_type='tier', points_cost=100 → success (points field is optional, irrelevant)", () => {
      const result = zPrizeSchema.safeParse({
        ...BASE,
        unlock_type: 'tier',
        points_cost: 100,
        min_tier_level: 2,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('optional fields', () => {
    it('[HAPPY PATH] image_url=null → success', () => {
      const result = zPrizeSchema.safeParse({ ...BASE, image_url: null })
      expect(result.success).toBe(true)
    })

    it('[HAPPY PATH] image_url=undefined → success (optional)', () => {
      const result = zPrizeSchema.safeParse({ ...BASE, image_url: undefined })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] image_url='not-a-url' → success:false, issue on path ['image_url']", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, image_url: 'not-a-url' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'image_url')).toBe(true)
      }
    })

    it('[HAPPY PATH] sort_order omitted → default 0', () => {
      const { sort_order: _so, ...rest } = BASE
      const result = zPrizeSchema.safeParse(rest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sort_order).toBe(0)
      }
    })

    it('[HAPPY PATH] is_active omitted → default true', () => {
      const { is_active: _ia, ...rest } = BASE
      const result = zPrizeSchema.safeParse(rest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true)
      }
    })

    it('[HAPPY PATH] venue_id=null → success', () => {
      const result = zPrizeSchema.safeParse({ ...BASE, venue_id: null })
      expect(result.success).toBe(true)
    })

    it('[HAPPY PATH] venue_id valid UUID → success', () => {
      const result = zPrizeSchema.safeParse({ ...BASE, venue_id: VALID_VENUE_UUID })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] venue_id='not-uuid' → success:false, issue on path ['venue_id']", () => {
      const result = zPrizeSchema.safeParse({ ...BASE, venue_id: 'not-uuid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'venue_id')).toBe(true)
      }
    })
  })
})

describe('parsePrizeFormData', () => {
  it("[HAPPY PATH] unlock_type='points', points_cost='100' → output has points_cost=100 (Number), min_tier_level=null", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.points_cost).toBe(100)
    expect(result.min_tier_level).toBeNull()
  })

  it("[HAPPY PATH] unlock_type='tier', min_tier_level='2' → output has min_tier_level=2 (Number), points_cost=null", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'free_item',
      unlock_type: 'tier',
      min_tier_level: '2',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.min_tier_level).toBe(2)
    expect(result.points_cost).toBeNull()
  })

  it("[EDGE CASE] unlimited_stock='on' → output has stock=null regardless of stock field", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'voucher',
      unlock_type: 'points',
      points_cost: '50',
      stock: '100',
      unlimited_stock: 'on',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.stock).toBeNull()
  })

  it("[EDGE CASE] unlimited_stock NOT 'on', stock='50' → output has stock=50", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'voucher',
      unlock_type: 'points',
      points_cost: '50',
      stock: '50',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.stock).toBe(50)
  })

  it("[EDGE CASE] venue_id='' → output has venue_id=null", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      venue_id: '',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.venue_id).toBeNull()
  })

  it("[EDGE CASE] image_url='' → output has image_url=null", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      image_url: '',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.image_url).toBeNull()
  })

  it("[EDGE CASE] description='' → output has description=null", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      description: '',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.description).toBeNull()
  })

  it("[HAPPY PATH] is_active='true' → output has is_active=true (boolean)", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      sort_order: '0',
      is_active: 'true',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.is_active).toBe(true)
  })

  it("[HAPPY PATH] is_active='false' → output has is_active=false (boolean)", () => {
    const fd = makeFormData({
      name: 'Test Prize',
      type: 'discount',
      unlock_type: 'points',
      points_cost: '100',
      sort_order: '0',
      is_active: 'false',
    })
    const result = parsePrizeFormData(fd) as Record<string, unknown>
    expect(result.is_active).toBe(false)
  })
})
