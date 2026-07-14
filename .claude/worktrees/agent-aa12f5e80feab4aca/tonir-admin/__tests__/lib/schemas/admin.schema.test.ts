import { describe, it, expect } from 'vitest'
import {
  zCreateAdminSchema,
  zUpdateAdminSchema,
  parseCreateAdminFormData,
  parseUpdateAdminFormData,
} from '@/lib/schemas/admin.schema'

const VALID_UUID_A  = 'b0000000-0000-4000-a000-000000000001'
const VALID_UUID_B  = 'c0000000-0000-4000-a000-000000000002'
const VALID_ADMIN_ID = 'e0000000-0000-4000-a000-000000000004'

describe('zCreateAdminSchema', () => {
  const BASE_CREATE = {
    name: 'Alice Admin',
    email: 'alice@example.com',
    password: 'password123',
    managed_venue_ids: [VALID_UUID_A],
  }

  it('[HAPPY PATH] all valid → success', () => {
    const result = zCreateAdminSchema.safeParse(BASE_CREATE)
    expect(result.success).toBe(true)
  })

  it("[FAILURE] name='' → success:false, issue on path ['name']", () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'name')).toBe(true)
    }
  })

  it('[FAILURE] name missing → success:false', () => {
    const { name: _name, ...rest } = BASE_CREATE
    const result = zCreateAdminSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it("[FAILURE] email='not-an-email' → success:false, issue on path ['email']", () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'email')).toBe(true)
    }
  })

  it("[FAILURE] email='' → success:false", () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, email: '' })
    expect(result.success).toBe(false)
  })

  it('[FAILURE] password 7 chars → success:false, issue on path [\'password\']', () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, password: 'short12' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'password')).toBe(true)
    }
  })

  it('[HAPPY PATH] password exactly 8 chars → success', () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, password: '12345678' })
    expect(result.success).toBe(true)
  })

  it("[FAILURE] managed_venue_ids=[] → success:false, issue on path ['managed_venue_ids']", () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, managed_venue_ids: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'managed_venue_ids')).toBe(true)
    }
  })

  it("[FAILURE] managed_venue_ids=['not-uuid'] → success:false (uuid validation on array item)", () => {
    const result = zCreateAdminSchema.safeParse({ ...BASE_CREATE, managed_venue_ids: ['not-uuid'] })
    expect(result.success).toBe(false)
  })

  it('[HAPPY PATH] managed_venue_ids=[VALID_UUID_A, VALID_UUID_B] → success (multiple venues allowed)', () => {
    const result = zCreateAdminSchema.safeParse({
      ...BASE_CREATE,
      managed_venue_ids: [VALID_UUID_A, VALID_UUID_B],
    })
    expect(result.success).toBe(true)
  })
})

describe('zUpdateAdminSchema', () => {
  const BASE_UPDATE = {
    id: VALID_ADMIN_ID,
    name: 'Alice Admin',
    email: 'alice@example.com',
    password: 'password123',
    managed_venue_ids: [VALID_UUID_A],
  }

  it('[HAPPY PATH] all valid with password → success', () => {
    const result = zUpdateAdminSchema.safeParse(BASE_UPDATE)
    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] password omitted (undefined) → success (optional)', () => {
    const { password: _pw, ...rest } = BASE_UPDATE
    const result = zUpdateAdminSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it("[HAPPY PATH] password='' (empty string) → success (or(z.literal('')))", () => {
    const result = zUpdateAdminSchema.safeParse({ ...BASE_UPDATE, password: '' })
    expect(result.success).toBe(true)
  })

  it("[FAILURE] password='short' (not empty, not >=8) → success:false", () => {
    const result = zUpdateAdminSchema.safeParse({ ...BASE_UPDATE, password: 'short12' })
    expect(result.success).toBe(false)
  })

  it("[FAILURE] id='not-uuid' → success:false, issue on path ['id']", () => {
    const result = zUpdateAdminSchema.safeParse({ ...BASE_UPDATE, id: 'not-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'id')).toBe(true)
    }
  })

  it('[HAPPY PATH] id=VALID_ADMIN_ID → success', () => {
    const result = zUpdateAdminSchema.safeParse(BASE_UPDATE)
    expect(result.success).toBe(true)
  })

  it("[FAILURE] name='' → success:false", () => {
    const result = zUpdateAdminSchema.safeParse({ ...BASE_UPDATE, name: '' })
    expect(result.success).toBe(false)
  })
})

describe('parseCreateAdminFormData', () => {
  it('[HAPPY PATH] multiple venue_id appended → managed_venue_ids is an array of all values', () => {
    const fd = new FormData()
    fd.set('name', 'Alice Admin')
    fd.set('email', 'alice@example.com')
    fd.set('password', 'password123')
    fd.append('venue_id', VALID_UUID_A)
    fd.append('venue_id', VALID_UUID_B)
    const result = parseCreateAdminFormData(fd) as Record<string, unknown>
    expect(Array.isArray(result.managed_venue_ids)).toBe(true)
    expect(result.managed_venue_ids).toEqual([VALID_UUID_A, VALID_UUID_B])
  })

  it('[EDGE CASE] empty venue_id entry is filtered out (filter(Boolean) removes it)', () => {
    const fd = new FormData()
    fd.set('name', 'Alice Admin')
    fd.set('email', 'alice@example.com')
    fd.set('password', 'password123')
    fd.append('venue_id', VALID_UUID_A)
    fd.append('venue_id', '')
    const result = parseCreateAdminFormData(fd) as Record<string, unknown>
    expect(result.managed_venue_ids).toEqual([VALID_UUID_A])
  })

  it('[EDGE CASE] name is trimmed (leading/trailing spaces removed)', () => {
    const fd = new FormData()
    fd.set('name', '  Alice Admin  ')
    fd.set('email', 'alice@example.com')
    fd.set('password', 'password123')
    fd.append('venue_id', VALID_UUID_A)
    const result = parseCreateAdminFormData(fd) as Record<string, unknown>
    expect(result.name).toBe('Alice Admin')
  })
})

describe('parseUpdateAdminFormData', () => {
  it('[HAPPY PATH] password present → included in output', () => {
    const fd = new FormData()
    fd.set('id', VALID_ADMIN_ID)
    fd.set('name', 'Alice Admin')
    fd.set('email', 'alice@example.com')
    fd.set('password', 'newpassword1')
    fd.append('venue_id', VALID_UUID_A)
    const result = parseUpdateAdminFormData(fd) as Record<string, unknown>
    expect(result.password).toBe('newpassword1')
  })

  it("[EDGE CASE] password='' → output has password=undefined (falsy string → undefined via || undefined)", () => {
    const fd = new FormData()
    fd.set('id', VALID_ADMIN_ID)
    fd.set('name', 'Alice Admin')
    fd.set('email', 'alice@example.com')
    fd.set('password', '')
    fd.append('venue_id', VALID_UUID_A)
    const result = parseUpdateAdminFormData(fd) as Record<string, unknown>
    expect(result.password).toBeUndefined()
  })

  it('[HAPPY PATH] id is trimmed', () => {
    const fd = new FormData()
    fd.set('id', `  ${VALID_ADMIN_ID}  `)
    fd.set('name', 'Alice Admin')
    fd.set('email', 'alice@example.com')
    fd.append('venue_id', VALID_UUID_A)
    const result = parseUpdateAdminFormData(fd) as Record<string, unknown>
    expect(result.id).toBe(VALID_ADMIN_ID)
  })
})
