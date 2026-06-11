/**
 * Unit tests for app/api/send-push/route.ts
 *
 * This route has significant business logic:
 *   - Authorization: only super_admin may call it
 *   - Target types: 'all', 'tier', 'user'
 *   - Input validation: title and body are required
 *   - Expo push batching: tokens are sent in chunks of 100
 *   - Result aggregation: ok/fail counts are summed across batches
 *
 * Risk areas:
 *   - Chunking boundary (exactly 100, exactly 101, 200 tokens)
 *   - Expo API failure → all tokens in that batch count as failed
 *   - Empty token list → 0-send response without calling Expo
 *   - Whitespace-only title/body must be rejected
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock('@/lib/current-admin', () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { POST, GET } from '@/app/api/send-push/route'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { makeMockSupabaseClient, makeChain, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

// ── Global fetch mock ──────────────────────────────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

function makeExpoResponse(statuses: Array<'ok' | 'error'>) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: statuses.map(status => ({ status })) }),
  } as Response)
}

function makeFailedFetchResponse() {
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
}

function makePOSTRequest(body: object) {
  return new NextRequest('http://localhost/api/send-push', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeGETRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/send-push')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function makeProfiles(count: number, pushToken = true) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    push_token: pushToken ? `ExponentPushToken[token-${i}]` : null,
  }))
}

describe('POST /api/send-push', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    mockFetch.mockReset()
  })

  // ── Authorization ──────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 403 when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Forbidden' })
  })

  it('[FAILURE SCENARIO] returns 403 for regular admin (not super_admin)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(403)
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 400 when title is missing', async () => {
    const client = makeMockSupabaseClient()
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await POST(makePOSTRequest({ title: '', body: 'Body', target: { type: 'all' } }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({ error: expect.stringContaining('required') })
  })

  it('[FAILURE SCENARIO] returns 400 when body is missing', async () => {
    const res = await POST(makePOSTRequest({ title: 'Title', body: '', target: { type: 'all' } }))

    expect(res.status).toBe(400)
  })

  it('[FAILURE SCENARIO] returns 400 when title is whitespace-only', async () => {
    const res = await POST(makePOSTRequest({ title: '   ', body: 'Body', target: { type: 'all' } }))

    expect(res.status).toBe(400)
  })

  it('[FAILURE SCENARIO] returns 400 when body is whitespace-only', async () => {
    const res = await POST(makePOSTRequest({ title: 'Title', body: '  ', target: { type: 'all' } }))

    expect(res.status).toBe(400)
  })

  // ── Happy paths — targeting ────────────────────────────────────────────────

  it('[HAPPY PATH] returns {sent:0, failed:0, total:0} when no push tokens exist', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: [], error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ sent: 0, failed: 0, total: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('[HAPPY PATH] target type "all" — sends to all users with push tokens', async () => {
    const profiles = makeProfiles(3)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }, { status: 'ok' }, { status: 'ok' }] }),
    })

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ sent: 3, failed: 0, total: 3 })

    // Verify no tier/user filter is applied for 'all'
    const chain = (client.from as any).mock.results[0].value
    expect(chain.eq).not.toHaveBeenCalledWith('tier_level', expect.anything())
    expect(chain.eq).not.toHaveBeenCalledWith('id', expect.anything())
  })

  it('[HAPPY PATH] target type "tier" — filters by tier_level', async () => {
    const profiles = makeProfiles(2)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    })

    const res = await POST(makePOSTRequest({
      title: 'Tier News', body: 'Exclusive', target: { type: 'tier', tier: 3 },
    }))

    expect(res.status).toBe(200)
    const chain = (client.from as any).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('tier_level', 3)
  })

  it('[HAPPY PATH] target type "user" — filters by userId', async () => {
    const profiles = [{ id: 'u-specific', push_token: 'ExponentPushToken[xyz]' }]
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }] }),
    })

    const res = await POST(makePOSTRequest({
      title: 'Personal', body: 'For you only', target: { type: 'user', userId: 'u-specific' },
    }))

    expect(res.status).toBe(200)
    const chain = (client.from as any).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('id', 'u-specific')
  })

  // ── Chunking logic ─────────────────────────────────────────────────────────

  it('[EDGE CASE] exactly 100 tokens — sends in a single batch (one fetch call)', async () => {
    const profiles = makeProfiles(100)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue(makeExpoResponse(Array(100).fill('ok')))

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect((await res.json())).toMatchObject({ sent: 100, failed: 0, total: 100 })
  })

  it('[EDGE CASE] 101 tokens — splits into two batches (two fetch calls)', async () => {
    const profiles = makeProfiles(101)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    // First batch: 100 tokens, second batch: 1 token
    mockFetch
      .mockResolvedValueOnce(makeExpoResponse(Array(100).fill('ok')))
      .mockResolvedValueOnce(makeExpoResponse(['ok']))

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const json = await res.json()
    expect(json).toEqual({ sent: 101, failed: 0, total: 101 })
  })

  it('[EDGE CASE] 200 tokens — splits into exactly 2 batches', async () => {
    const profiles = makeProfiles(200)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    mockFetch
      .mockResolvedValueOnce(makeExpoResponse(Array(100).fill('ok')))
      .mockResolvedValueOnce(makeExpoResponse(Array(100).fill('ok')))

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect((await res.json())).toMatchObject({ total: 200 })
  })

  // ── Expo failure handling ──────────────────────────────────────────────────

  it('[FAILURE SCENARIO] Expo returns non-OK HTTP status → all tokens in batch counted as failed', async () => {
    const profiles = makeProfiles(5)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue(makeFailedFetchResponse())

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ sent: 0, failed: 5, total: 5 })
  })

  it('[FAILURE SCENARIO] Expo returns mixed ok/error statuses — counts correct', async () => {
    const profiles = makeProfiles(4)
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: profiles, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    mockFetch.mockResolvedValue(makeExpoResponse(['ok', 'error', 'ok', 'error']))

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    const json = await res.json()
    expect(json).toEqual({ sent: 2, failed: 2, total: 4 })
  })

  it('[FAILURE SCENARIO] supabase query error → 500', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { data: null, error: { message: 'DB error' } } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await POST(makePOSTRequest({ title: 'Hi', body: 'World', target: { type: 'all' } }))

    expect(res.status).toBe(500)
  })
})

describe('GET /api/send-push (preview count)', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
  })

  it('[FAILURE SCENARIO] returns 403 when not authenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const res = await GET(makeGETRequest({ type: 'all' }))

    expect(res.status).toBe(403)
  })

  it('[FAILURE SCENARIO] returns 403 for regular admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const res = await GET(makeGETRequest({ type: 'all' }))

    expect(res.status).toBe(403)
  })

  it('[HAPPY PATH] returns count for type=all', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { count: 42, data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    const res = await GET(makeGETRequest({ type: 'all' }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ count: 42 })
  })

  it('[HAPPY PATH] filters by tier_level for type=tier', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { count: 7, data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await GET(makeGETRequest({ type: 'tier', tier: '2' }))

    const chain = (client.from as any).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('tier_level', 2)
  })

  it('[HAPPY PATH] filters by userId for type=user', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { count: 1, data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    await GET(makeGETRequest({ type: 'user', userId: 'u-xyz' }))

    const chain = (client.from as any).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('id', 'u-xyz')
  })

  it('[EDGE CASE] returns count=0 when supabase count is null', async () => {
    const client = makeMockSupabaseClient({
      tableResponses: { profiles: { count: undefined, data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)

    // Override chain so count is null
    const chain = makeChain({ data: null, error: null })
    chain.then = (res: any) => Promise.resolve({ count: null, error: null }).then(res)
    ;(client.from as any).mockReturnValue(chain)

    const res = await GET(makeGETRequest({ type: 'all' }))
    const json = await res.json()
    expect(json.count).toBe(0)
  })
})
