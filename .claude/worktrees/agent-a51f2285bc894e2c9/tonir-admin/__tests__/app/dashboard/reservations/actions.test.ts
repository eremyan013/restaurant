/**
 * Unit tests for app/dashboard/reservations/actions.ts
 *
 * Covers three server actions:
 *   1. editReservation    — validates, checks role-based venue ownership, updates
 *   2. createReservationAdmin — validates, checks role-based venue ownership, inserts
 *   3. searchUsersAction  — query length gate, auth gate, returns results
 *
 * Key risk areas:
 *   - isoToDisplay() date formatting (tested indirectly through update() spy)
 *   - Role-based authorization: 'admin' must own the reservation's venue
 *   - Validation: people must be ≥ 1, date/time required
 *   - Optional fields (occasion, note) must be null, not empty string
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/current-admin',  () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache',           () => ({ revalidatePath: vi.fn() }))

import { editReservation, createReservationAdmin, searchUsersAction } from '@/app/dashboard/reservations/actions'
import { getCurrentAdmin }         from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { revalidatePath }           from 'next/cache'
import {
  makeMockSupabaseClient, makeChain, makeFormData,
  SUPER_ADMIN, REGULAR_ADMIN,
} from '../../../helpers/supabase-mock'

// ─────────────────────────────────────────────────────────────────────────────
// editReservation
// ─────────────────────────────────────────────────────────────────────────────
describe('editReservation()', () => {
  const PREV = { ok: false as const }

  // ── Authorization ────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns Unauthorized when no session', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[FAILURE SCENARIO] regular admin cannot edit a reservation for a venue they do not manage', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN) // manages ['venue-managed-1']
    const client = makeMockSupabaseClient({
      tableResponses: {
        // venue_id lookup returns a venue the admin does NOT manage
        reservations: { data: { venue_id: 'venue-other' }, error: null },
      },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[HAPPY PATH] regular admin can edit a reservation for their own venue', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN) // manages ['venue-managed-1']
    const client = makeMockSupabaseClient({
      tableResponses: {
        reservations: [
          { data: { venue_id: 'venue-managed-1' }, error: null }, // venue check
          { data: null, error: null },                             // update
        ],
      },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/reservations')
  })

  it('[HAPPY PATH] super_admin can edit any reservation without venue check', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { reservations: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-06-11', time: '20:00', people: '4' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: true })
    // super_admin should NOT perform the venue ownership check
    expect(client.from).toHaveBeenCalledTimes(1) // only the update call, not the venue_id lookup
  })

  // ── isoToDisplay date formatting ──────────────────────────────────────────

  it('[HAPPY PATH] correctly formats 2026-01-05 as "Mon, 5 Jan"', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = makeChain({ data: null, error: null })
    const client = { from: vi.fn(() => chain) }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    await editReservation(PREV, fd)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ date: 'Mon, 5 Jan', date_iso: '2026-01-05' })
    )
  })

  it('[HAPPY PATH] correctly formats 2026-01-01 as "Thu, 1 Jan"', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = makeChain({ data: null, error: null })
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn(() => chain) } as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-01', time: '18:00', people: '2' })
    await editReservation(PREV, fd)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ date: 'Thu, 1 Jan' })
    )
  })

  it('[HAPPY PATH] correctly formats 2026-06-11 as "Thu, 11 Jun"', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = makeChain({ data: null, error: null })
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn(() => chain) } as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-06-11', time: '18:00', people: '2' })
    await editReservation(PREV, fd)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ date: 'Thu, 11 Jun' })
    )
  })

  // ── Input validation ──────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns error when id is missing', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] returns error when date_iso is missing', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ id: 'r1', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('required') })
  })

  it('[FAILURE SCENARIO] returns error when time is missing', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] returns error when people = 0', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '0' })
    const result = await editReservation(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] returns error when people is NaN', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: 'abc' })
    const result = await editReservation(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[EDGE CASE] people = 1 is valid (minimum)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({ tableResponses: { reservations: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '1' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: true })
  })

  it('[HAPPY PATH] optional fields occasion and note become null when empty', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = makeChain({ data: null, error: null })
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn(() => chain) } as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    // occasion and note are NOT set
    await editReservation(PREV, fd)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ occasion: null, note: null })
    )
  })

  it('[FAILURE SCENARIO] supabase update error propagates as {ok:false, error}', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { reservations: { data: null, error: { message: 'FK constraint violation' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ id: 'r1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await editReservation(PREV, fd)

    expect(result).toEqual({ ok: false, error: 'FK constraint violation' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createReservationAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('createReservationAdmin()', () => {
  const PREV = { ok: false as const }

  it('[FAILURE SCENARIO] returns Unauthorized when no session', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const fd = makeFormData({
      venue_id: 'v1', user_id: 'u1', date_iso: '2026-01-05', time: '19:00', people: '2',
    })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[FAILURE SCENARIO] regular admin cannot create reservation for a venue they do not manage', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN) // manages ['venue-managed-1']

    const fd = makeFormData({
      venue_id: 'venue-other', user_id: 'u1', date_iso: '2026-01-05', time: '19:00', people: '2',
    })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('your venue') })
  })

  it('[HAPPY PATH] regular admin can create reservation for their own venue', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { reservations: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({
      venue_id: 'venue-managed-1', user_id: 'u1',
      date_iso: '2026-01-05', time: '19:00', people: '3',
    })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toEqual({ ok: true })
  })

  it('[HAPPY PATH] super_admin can create reservation for any venue', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { reservations: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({
      venue_id: 'any-venue', user_id: 'u1',
      date_iso: '2026-06-11', time: '20:00', people: '5',
    })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/reservations')
  })

  it('[HAPPY PATH] inserts with default status "confirmed" when not provided', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = makeChain({ data: null, error: null })
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn(() => chain) } as any)

    const fd = makeFormData({
      venue_id: 'v1', user_id: 'u1', date_iso: '2026-01-05', time: '19:00', people: '2',
    })
    await createReservationAdmin(PREV, fd)

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', yel_earned: '0' })
    )
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] missing venue_id → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ user_id: 'u1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] missing user_id → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ venue_id: 'v1', date_iso: '2026-01-05', time: '19:00', people: '2' })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] people = 0 → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({
      venue_id: 'v1', user_id: 'u1', date_iso: '2026-01-05', time: '19:00', people: '0',
    })
    const result = await createReservationAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchUsersAction
// ─────────────────────────────────────────────────────────────────────────────
describe('searchUsersAction()', () => {
  const PREV = { results: [] }

  it('[HAPPY PATH] returns users matching query when admin is present', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const mockUsers = [
      { id: 'u1', name: 'Alice', email: 'alice@x.com', player_id: 101 },
    ]
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: mockUsers, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ q: 'alice' })
    const result = await searchUsersAction(PREV, fd)

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({ id: 'u1', name: 'Alice' })
  })

  it('[EDGE CASE] returns empty results when query is 1 character', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ q: 'a' })
    const result = await searchUsersAction(PREV, fd)

    expect(result).toEqual({ results: [] })
  })

  it('[EDGE CASE] returns empty results when query is missing', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({})
    const result = await searchUsersAction(PREV, fd)

    expect(result).toEqual({ results: [] })
  })

  it('[FAILURE SCENARIO] returns empty results when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const fd = makeFormData({ q: 'alice' })
    const result = await searchUsersAction(PREV, fd)

    expect(result).toEqual({ results: [] })
  })

  it('[HAPPY PATH] returns empty array (not null) when supabase returns null data', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ q: 'zzz' })
    const result = await searchUsersAction(PREV, fd)

    expect(result.results).toEqual([])
  })

  it('[HAPPY PATH] limits results to 8', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: [], error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const fd = makeFormData({ q: 'user' })
    await searchUsersAction(PREV, fd)

    const chain = (client.from as any).mock.results[0].value
    expect(chain.limit).toHaveBeenCalledWith(8)
  })
})
