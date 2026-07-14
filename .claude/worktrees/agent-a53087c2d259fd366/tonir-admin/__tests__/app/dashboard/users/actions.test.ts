/**
 * Unit tests for app/dashboard/users/[id]/actions.ts
 *
 * updateUser():
 *   - Only super_admin may call it (regular admin → Unauthorized)
 *   - tier_level must be 1–4 inclusive (boundary tests)
 *   - name and email are required
 *   - Updates both auth email AND profiles table
 *   - Auth update error → stops and returns error (no profile update)
 *   - Profile update error → returns error
 *
 * Risk areas:
 *   - tier_level = 0 or 5 must be rejected (boundary)
 *   - tier_level = 1 and 4 must be accepted (inclusive boundary)
 *   - Empty phone must be stored as null, not empty string
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/current-admin',  () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache',           () => ({ revalidatePath: vi.fn() }))

import { updateUser } from '@/app/dashboard/users/[id]/actions'
import { getCurrentAdmin }         from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { revalidatePath }           from 'next/cache'
import { makeMockSupabaseClient, makeFormData, SUPER_ADMIN, REGULAR_ADMIN } from '../../../helpers/supabase-mock'

describe('updateUser()', () => {
  const PREV = { ok: false as const }

  function makeValidFormData(overrides: Partial<Record<string, string>> = {}) {
    return makeFormData({
      id:         'user-uuid-1',
      name:       'Alice Smith',
      email:      'alice@example.com',
      tier_level: '2',
      ...overrides,
    })
  }

  // ── Authorization ────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns Unauthorized when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const result = await updateUser(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[FAILURE SCENARIO] returns Unauthorized for regular admin (role = "admin")', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const result = await updateUser(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] super_admin updates user successfully', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateUser(PREV, makeValidFormData())

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(expect.stringContaining('/dashboard/users'))
  })

  it('[HAPPY PATH] calls auth.admin.updateUserById with the correct email', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await updateUser(PREV, makeValidFormData({ email: 'new@example.com', id: 'user-1' }))

    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', { email: 'new@example.com' })
  })

  it('[HAPPY PATH] empty phone is stored as null in the profile update', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (r: any) => Promise.resolve({ data: null, error: null }).then(r),
    }
    const client = {
      ...makeMockSupabaseClient(),
      from: vi.fn(() => chain)
    }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    // phone is not set → should be null
    await updateUser(PREV, makeValidFormData())

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null })
    )
  })

  it('[HAPPY PATH] tier_level revalidates both user page and list page', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await updateUser(PREV, makeValidFormData({ id: 'u-abc' }))

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/users/u-abc')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/users')
  })

  // ── tier_level boundary validation ────────────────────────────────────────

  it('[EDGE CASE] tier_level = 1 is valid (lower bound)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({ tableResponses: { profiles: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateUser(PREV, makeValidFormData({ tier_level: '1' }))

    expect(result).toEqual({ ok: true })
  })

  it('[EDGE CASE] tier_level = 4 is valid (upper bound)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({ tableResponses: { profiles: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateUser(PREV, makeValidFormData({ tier_level: '4' }))

    expect(result).toEqual({ ok: true })
  })

  it('[FAILURE SCENARIO] tier_level = 0 → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ tier_level: '0' }))

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('1 and 4') })
  })

  it('[FAILURE SCENARIO] tier_level = 5 → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ tier_level: '5' }))

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('1 and 4') })
  })

  it('[FAILURE SCENARIO] tier_level = NaN (non-numeric) → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ tier_level: 'gold' }))

    expect(result).toMatchObject({ ok: false })
  })

  // ── Required field validation ─────────────────────────────────────────────

  it('[FAILURE SCENARIO] missing name → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ name: '' }))

    expect(result).toMatchObject({ ok: false, error: 'Name and email are required.' })
  })

  it('[FAILURE SCENARIO] missing email → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ email: '' }))

    expect(result).toMatchObject({ ok: false, error: 'Name and email are required.' })
  })

  it('[FAILURE SCENARIO] missing id → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateUser(PREV, makeValidFormData({ id: '' }))

    expect(result).toMatchObject({ ok: false })
  })

  // ── Supabase errors ───────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] auth update error → returns error without calling profile update', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      auth: {
        updateUserById: { error: { message: 'Email already in use' } },
      },
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateUser(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Email already in use' })
    // Profile update should NOT have been called
    expect(client.from).not.toHaveBeenCalled()
  })

  it('[FAILURE SCENARIO] profile update error → returns error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: { message: 'Duplicate email in profiles' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateUser(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Duplicate email in profiles' })
  })
})
