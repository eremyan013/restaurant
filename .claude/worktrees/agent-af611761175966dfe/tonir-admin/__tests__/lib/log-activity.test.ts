/**
 * Unit tests for lib/log-activity.ts
 *
 * logActivity() must:
 *   1. Be a no-op when admin is null (never crash the calling operation).
 *   2. Insert a correctly-shaped row into admin_activity_log.
 *   3. Swallow supabase errors silently (never rethrow).
 *
 * Coverage targets:
 *   - null admin early return
 *   - correct payload construction (all fields)
 *   - optional `details` defaults to null when omitted
 *   - optional `details` is passed through when provided
 *   - supabase error is swallowed, function returns void
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockInstance } from 'vitest'

// ── Module mocks (hoisted) ─────────────────────────────────────────────────
vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { logActivity } from '@/lib/log-activity'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { makeMockSupabaseClient, SUPER_ADMIN } from '../helpers/supabase-mock'

describe('logActivity()', () => {
  let mockClient: ReturnType<typeof makeMockSupabaseClient>
  let insertSpy: MockInstance

  beforeEach(() => {
    mockClient = makeMockSupabaseClient({
      tableResponses: { admin_activity_log: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient as any)

    // Capture the chain returned for admin_activity_log so we can inspect insert()
    insertSpy = mockClient.from as unknown as MockInstance
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] should insert an activity row with all required fields', async () => {
    await logActivity(SUPER_ADMIN, 'confirm_reservation', 'reservation', 'res-1', 'Table for 2')

    expect(mockClient.from).toHaveBeenCalledWith('admin_activity_log')
    const chain = (mockClient.from as any).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith({
      admin_id:    SUPER_ADMIN.id,
      admin_name:  SUPER_ADMIN.name,
      action:      'confirm_reservation',
      entity_type: 'reservation',
      entity_id:   'res-1',
      entity_name: 'Table for 2',
      details:     null,
    })
  })

  it('[HAPPY PATH] should pass through details when provided', async () => {
    const details = { amount: 500, reason: 'bonus' }
    await logActivity(SUPER_ADMIN, 'adjust_yel', 'profile', 'u-1', 'Alice', details)

    const chain = (mockClient.from as any).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ details })
    )
  })

  it('[HAPPY PATH] details defaults to null when omitted', async () => {
    await logActivity(SUPER_ADMIN, 'cancel_reservation', 'reservation', 'r-2', 'Res #42')

    const chain = (mockClient.from as any).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ details: null })
    )
  })

  it('[HAPPY PATH] works for all defined ActivityAction values', async () => {
    const actions = [
      'confirm_reservation', 'cancel_reservation', 'mark_visited', 'update_reservation_note',
      'approve_review', 'hide_review', 'delete_review',
      'adjust_yel', 'bulk_adjust_yel',
      'update_venue', 'delete_venue', 'create_venue',
      'toggle_prize', 'delete_prize', 'create_prize',
      'mark_prize_used',
      'resolve_concierge', 'escalate_concierge',
    ] as const

    for (const action of actions) {
      vi.clearAllMocks()
      mockClient = makeMockSupabaseClient({
        tableResponses: { admin_activity_log: { data: null, error: null } },
      })
      vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient as any)
      await expect(
        logActivity(SUPER_ADMIN, action, 'entity', 'id', 'name')
      ).resolves.toBeUndefined()
    }
  })

  // ── Null admin early return ────────────────────────────────────────────────

  it('[EDGE CASE] should return immediately without calling supabase when admin is null', async () => {
    await logActivity(null, 'confirm_reservation', 'reservation', 'r-1', 'Res')

    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('[EDGE CASE] should return undefined (void) when admin is null', async () => {
    const result = await logActivity(null, 'cancel_reservation', 'reservation', 'r-2', 'Res')
    expect(result).toBeUndefined()
  })

  // ── Failure scenarios ──────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] should swallow supabase insert error and not rethrow', async () => {
    const throwingClient = {
      ...mockClient,
      from: vi.fn(() => {
        throw new Error('DB connection refused')
      }),
    }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(throwingClient as any)

    // Must not throw — logging must never crash the caller
    await expect(
      logActivity(SUPER_ADMIN, 'confirm_reservation', 'reservation', 'r-1', 'Res')
    ).resolves.toBeUndefined()
  })

  it('[FAILURE SCENARIO] should swallow rejected promise from supabase', async () => {
    const rejectingClient = makeMockSupabaseClient({
      tableResponses: { admin_activity_log: { data: null, error: { message: 'network error' } } },
    })
    // Make the chain's then() reject
    const chain = (rejectingClient.from as any)() as any
    vi.spyOn(chain, 'insert').mockRejectedValue(new Error('insert rejected'))
    rejectingClient.from = vi.fn(() => chain)
    vi.mocked(createSupabaseAdminClient).mockReturnValue(rejectingClient as any)

    await expect(
      logActivity(SUPER_ADMIN, 'approve_review', 'review', 'rv-1', 'Good review')
    ).resolves.toBeUndefined()
  })
})
