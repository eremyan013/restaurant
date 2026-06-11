/**
 * Unit tests for app/dashboard/admins/actions.ts
 *
 * Covers three server actions: createAdmin, updateAdmin, deleteAdmin.
 *
 * Key risk areas:
 *   - All three actions are super_admin-only
 *   - createAdmin must roll back the auth user if the profile upsert fails
 *     (avoids orphaned Supabase auth accounts)
 *   - updateAdmin must include password in auth update ONLY when provided
 *   - deleteAdmin demotes the user to 'user' role (soft delete, not hard delete)
 *   - All validation paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/current-admin',  () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache',           () => ({ revalidatePath: vi.fn() }))

import { createAdmin, updateAdmin, deleteAdmin } from '@/app/dashboard/admins/actions'
import { getCurrentAdmin }         from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { revalidatePath }           from 'next/cache'
import { makeMockSupabaseClient, makeFormData, SUPER_ADMIN, REGULAR_ADMIN } from '../../../helpers/supabase-mock'

// ─────────────────────────────────────────────────────────────────────────────
// createAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('createAdmin()', () => {
  const PREV = { ok: false as const }

  function makeValidFormData(overrides: Partial<Record<string, string | string[]>> = {}) {
    return makeFormData({
      name:     'Jane Admin',
      email:    'jane@tonir.am',
      password: 'SecurePass123!',
      venue_id: ['venue-uuid-1'],
      ...overrides,
    })
  }

  // ── Authorization ────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns Unauthorized when not super_admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[FAILURE SCENARIO] returns Unauthorized when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] creates auth user and upserts profile', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toEqual({ ok: true })
    expect(client.auth.admin.createUser).toHaveBeenCalledWith({
      email:         'jane@tonir.am',
      password:      'SecurePass123!',
      email_confirm: true,
    })
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/admins')
  })

  it('[HAPPY PATH] upserts profile with correct role and venue data', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      then: (r: any) => Promise.resolve({ data: null, error: null }).then(r),
    }
    const client = { ...makeMockSupabaseClient(), from: vi.fn(() => chain) }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await createAdmin(PREV, makeValidFormData({ venue_id: ['venue-A', 'venue-B'] }))

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role:              'admin',
        is_admin:         true,
        managed_venue_ids: ['venue-A', 'venue-B'],
        managed_venue_id:  'venue-A',
      })
    )
  })

  // ── Profile upsert failure → auth rollback ────────────────────────────────

  it('[FAILURE SCENARIO] rolls back auth user when profile upsert fails', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: { message: 'unique_violation' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toMatchObject({ ok: false, error: 'unique_violation' })
    // The newly created auth user must be deleted to avoid orphans
    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-uuid')
  })

  it('[FAILURE SCENARIO] rollback attempt does not throw even if deleteUser fails', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: { message: 'upsert failed' } } },
      auth: { deleteUser: { error: { message: 'delete failed too' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    // Must not throw even if rollback itself fails
    await expect(createAdmin(PREV, makeValidFormData())).resolves.toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] returns error when auth.admin.createUser fails', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      auth: { createUser: { data: null, error: { message: 'Email already registered' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toMatchObject({ ok: false, error: 'Email already registered' })
  })

  it('[FAILURE SCENARIO] returns error when createUser returns no user object', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      auth: { createUser: { data: { user: null }, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await createAdmin(PREV, makeValidFormData())

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('Failed to create user') })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] missing name → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await createAdmin(PREV, makeValidFormData({ name: '' }))

    expect(result).toMatchObject({ ok: false, error: 'All fields are required.' })
  })

  it('[FAILURE SCENARIO] missing email → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await createAdmin(PREV, makeValidFormData({ email: '' }))

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] missing password → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await createAdmin(PREV, makeValidFormData({ password: '' }))

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] no venue_id provided → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ name: 'Jane', email: 'j@t.am', password: 'pass' }) // no venue_id
    const result = await createAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('updateAdmin()', () => {
  const PREV = { ok: false as const }

  function makeValidFormData(overrides: Partial<Record<string, string | string[]>> = {}) {
    return makeFormData({
      id:       'admin-uuid-1',
      name:     'Jane Admin',
      email:    'jane@tonir.am',
      venue_id: ['venue-uuid-1'],
      ...overrides,
    })
  }

  it('[FAILURE SCENARIO] returns Unauthorized when not super_admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const result = await updateAdmin(PREV, makeValidFormData())

    expect(result).toEqual({ ok: false, error: 'Unauthorized' })
  })

  it('[HAPPY PATH] updates email and profile without password when password omitted', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateAdmin(PREV, makeValidFormData()) // no password field

    expect(result).toEqual({ ok: true })
    // Auth update should only include email (no password key)
    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(
      'admin-uuid-1',
      { email: 'jane@tonir.am' }
    )
    expect(client.auth.admin.updateUserById).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ password: expect.anything() })
    )
  })

  it('[HAPPY PATH] includes password in auth update when password is provided', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await updateAdmin(PREV, makeValidFormData({ password: 'NewSecret456!' }))

    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(
      'admin-uuid-1',
      { email: 'jane@tonir.am', password: 'NewSecret456!' }
    )
  })

  it('[FAILURE SCENARIO] missing name → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const result = await updateAdmin(PREV, makeValidFormData({ name: '' }))

    expect(result).toMatchObject({ ok: false })
  })

  it('[FAILURE SCENARIO] no venue_ids → validation error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)

    const fd = makeFormData({ id: 'a1', name: 'Jane', email: 'j@t.am' }) // no venue_id
    const result = await updateAdmin(PREV, fd)

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('venue') })
  })

  it('[FAILURE SCENARIO] auth error → returns error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      auth: { updateUserById: { error: { message: 'User not found' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const result = await updateAdmin(PREV, makeValidFormData())

    expect(result).toMatchObject({ ok: false, error: 'User not found' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteAdmin()', () => {
  it('[FAILURE SCENARIO] does nothing when not super_admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)
    const client = makeMockSupabaseClient()
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await deleteAdmin(undefined, makeFormData({ id: 'a1' }))

    expect(client.from).not.toHaveBeenCalled()
  })

  it('[FAILURE SCENARIO] does nothing when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const client = makeMockSupabaseClient()
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await deleteAdmin(undefined, makeFormData({ id: 'a1' }))

    expect(client.from).not.toHaveBeenCalled()
  })

  it('[FAILURE SCENARIO] does nothing when id is missing', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient()
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await deleteAdmin(undefined, makeFormData({})) // no id

    expect(client.from).not.toHaveBeenCalled()
  })

  it('[HAPPY PATH] demotes admin to user role (soft delete, not hard delete)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      then:   (r: any) => Promise.resolve({ data: null, error: null }).then(r),
    }
    const client = { from: vi.fn(() => chain) }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await deleteAdmin(undefined, makeFormData({ id: 'admin-to-remove' }))

    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        role:             'user',
        is_admin:         false,
        managed_venue_ids: [],
        managed_venue_id:  null,
      })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'admin-to-remove')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/admins')
  })

  it('[HAPPY PATH] does NOT call auth.admin.deleteUser (auth account is preserved)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await deleteAdmin(undefined, makeFormData({ id: 'admin-to-remove' }))

    // auth.admin.deleteUser should NOT be called — only profile demotion
    expect(client.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
})
