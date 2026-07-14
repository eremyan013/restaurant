import { describe, it, expect } from 'vitest'
import { zNewReservationSchema, zEditReservationSchema } from '@/lib/schemas/reservation.schema'

const VENUE_ID = 'b0000000-0000-4000-a000-000000000001'
const USER_ID  = 'd0000000-0000-4000-a000-000000000003'
const RES_ID   = 'e0000000-0000-4000-a000-000000000004'

// Minimal valid inputs
const BASE_NEW  = { venue_id: VENUE_ID, user_id: USER_ID, date_iso: '2026-06-15', time: '19:00', people: 2 }
const BASE_EDIT = { id: RES_ID, date_iso: '2026-06-15', time: '19:00', people: 2 }

describe('zNewReservationSchema', () => {
  describe('venue_id and user_id UUID validation', () => {
    it('[HAPPY PATH] valid UUIDs → success', () => {
      const result = zNewReservationSchema.safeParse(BASE_NEW)
      expect(result.success).toBe(true)
    })

    it("[FAILURE] venue_id='not-uuid' → success:false, issue on path ['venue_id']", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, venue_id: 'not-uuid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'venue_id')).toBe(true)
      }
    })

    it("[FAILURE] user_id='not-uuid' → success:false, issue on path ['user_id']", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, user_id: 'not-uuid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'user_id')).toBe(true)
      }
    })
  })

  describe('date_iso format', () => {
    it("[HAPPY PATH] '2026-01-05' → success", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, date_iso: '2026-01-05' })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] '01-05-2026' → success:false (wrong order)", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, date_iso: '01-05-2026' })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] '2026-1-5' → success:false (missing leading zeros)", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, date_iso: '2026-1-5' })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] '20260105' → success:false (no dashes)", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, date_iso: '20260105' })
      expect(result.success).toBe(false)
    })
  })

  describe('time format', () => {
    it("[HAPPY PATH] '09:00' → success", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, time: '09:00' })
      expect(result.success).toBe(true)
    })

    it("[HAPPY PATH] '19:30' → success", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, time: '19:30' })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] '9:00' → success:false (missing leading zero)", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, time: '9:00' })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] '9am' → success:false", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, time: '9am' })
      expect(result.success).toBe(false)
    })

    // Known gap: the HH:MM regex only checks format, not valid clock values
    it('[EDGE CASE] \'25:00\' → success:true (regex only checks HH:MM format, not valid clock value — known gap)', () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, time: '25:00' })
      expect(result.success).toBe(true)
    })
  })

  describe('people count', () => {
    it('[HAPPY PATH] people=1 → success (minimum boundary)', () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, people: 1 })
      expect(result.success).toBe(true)
    })

    it('[HAPPY PATH] people=50 → success (maximum boundary)', () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, people: 50 })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] people=0 → success:false, issue on path ['people']", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, people: 0 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path[0] === 'people')).toBe(true)
      }
    })

    it('[FAILURE] people=51 → success:false', () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, people: 51 })
      expect(result.success).toBe(false)
    })
  })

  describe('status default', () => {
    it("[HAPPY PATH] status omitted → success, output.status === 'confirmed'", () => {
      const result = zNewReservationSchema.safeParse(BASE_NEW)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('confirmed')
      }
    })

    it("[HAPPY PATH] status='pending' → success", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, status: 'pending' })
      expect(result.success).toBe(true)
    })

    it("[FAILURE] status='visited' → success:false (not in enum)", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, status: 'visited' })
      expect(result.success).toBe(false)
    })

    it("[FAILURE] status='cancelled' → success:false", () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, status: 'cancelled' })
      expect(result.success).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('[HAPPY PATH] occasion=null → success', () => {
      const result = zNewReservationSchema.safeParse({ ...BASE_NEW, occasion: null })
      expect(result.success).toBe(true)
    })

    it('[HAPPY PATH] note omitted → success', () => {
      const result = zNewReservationSchema.safeParse(BASE_NEW)
      expect(result.success).toBe(true)
    })
  })
})

describe('zEditReservationSchema', () => {
  it('[HAPPY PATH] all valid → success', () => {
    const result = zEditReservationSchema.safeParse(BASE_EDIT)
    expect(result.success).toBe(true)
  })

  it('[FAILURE] id missing → success:false', () => {
    const { id: _id, ...rest } = BASE_EDIT
    const result = zEditReservationSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it("[FAILURE] id='not-uuid' → success:false, issue on path ['id']", () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, id: 'not-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'id')).toBe(true)
    }
  })

  it('[HAPPY PATH] id=RES_ID (valid UUID) → success', () => {
    const result = zEditReservationSchema.safeParse(BASE_EDIT)
    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] occasion=null → success', () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, occasion: null })
    expect(result.success).toBe(true)
  })

  it('[HAPPY PATH] people=50 → success (maximum boundary)', () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, people: 50 })
    expect(result.success).toBe(true)
  })

  it('[FAILURE] people=51 → success:false', () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, people: 51 })
    expect(result.success).toBe(false)
  })

  it('[FAILURE] people=0 → success:false', () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, people: 0 })
    expect(result.success).toBe(false)
  })

  it('[FAILURE] date_iso missing → success:false', () => {
    const { date_iso: _d, ...rest } = BASE_EDIT
    const result = zEditReservationSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it("[FAILURE] time='9:00' → success:false (missing leading zero)", () => {
    const result = zEditReservationSchema.safeParse({ ...BASE_EDIT, time: '9:00' })
    expect(result.success).toBe(false)
  })
})
