/**
 * Unit tests for app/api/users/search/route.ts
 *
 * This route provides user search for notifications targeting (super_admin only).
 * Key behaviors:
 *   - Only super_admin may call it (not regular admin)
 *   - Query must be ≥ 2 chars (returns empty array otherwise)
 *   - Returns id, name, email, push_token fields
 *   - Searches name and email with ilike
 *   - Limits results to 10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/current-admin', () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { GET } from '@/app/api/users/search/route'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { makeMockSupabaseClient, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

function makeRequest(q?: string): NextRequest {
  const url = new URL('http://localhost/api/users/search')
  if (q !== undefined) url.searchParams.set('q', q)
  return new NextRequest(url)
}

const MOCK_USERS = [
  { id: 'u1', name: 'Alice Smith', email: 'alice@example.com', push_token: 'ExponentPushToken[abc]' },
  { id: 'u2', name: 'Bob Jones', email: 'bob@example.com', push_token: null },
]

describe('GET /api/users/search', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
  })

  // ── Authorization ──────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 403 when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const res = await GET(makeRequest('alice'))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Forbidden' })
  })

  it('[FAILURE SCENARIO] returns 403 for regular admin (role = "admin")', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const res = await GET(makeRequest('alice'))

    expect(res.status).toBe(403)
  })

  // ── Query length validation ────────────────────────────────────────────────

  it('[EDGE CASE] returns {users:[]} when query is missing entirely', async () => {
    const res = await GET(makeRequest(undefined))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ users: [] })
  })

  it('[EDGE CASE] returns {users:[]} when query is 1 character', async () => {
    const res = await GET(makeRequest('a'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ users: [] })
  })

  it('[EDGE CASE] returns {users:[]} when query is empty string', async () => {
    const res = await GET(makeRequest(''))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ users: [] })
  })

  it('[EDGE CASE] returns {users:[]} when query is whitespace-only (trimmed to empty)', async () => {
    const res = await GET(makeRequest('  '))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ users: [] })
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] returns users when query is exactly 2 characters', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: MOCK_USERS, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await GET(makeRequest('al'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.users).toHaveLength(2)
    expect(json.users[0]).toMatchObject({ id: 'u1', name: 'Alice Smith' })
  })

  it('[HAPPY PATH] returns users for normal query', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: MOCK_USERS, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await GET(makeRequest('alice'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.users).toHaveLength(2)
  })

  it('[HAPPY PATH] returns empty array (not null) when no users found', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await GET(makeRequest('zzzyyyy'))

    const json = await res.json()
    expect(json.users).toEqual([])
  })

  it('[HAPPY PATH] search uses OR with ilike for both name and email', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: [], error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await GET(makeRequest('alice'))

    const chain = (client.from as any).mock.results[0].value
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('name.ilike.%alice%')
    )
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('email.ilike.%alice%')
    )
  })

  it('[HAPPY PATH] applies limit of 10 to results', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: [], error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await GET(makeRequest('alice'))

    const chain = (client.from as any).mock.results[0].value
    expect(chain.limit).toHaveBeenCalledWith(10)
  })

  // ── Failure scenarios ──────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 500 on supabase query error', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: { message: 'Connection timeout' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await GET(makeRequest('alice'))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Connection timeout' })
  })
})
