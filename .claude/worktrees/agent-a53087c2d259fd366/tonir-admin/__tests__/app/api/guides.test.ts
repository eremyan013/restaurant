import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/current-admin', () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 29, resetAt: 0, toResponse: null }),
  RATE_WRITE: { limit: 30, windowSecs: 60 },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/guides/route'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'
import { makeMockSupabaseClient, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/guides', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Minimum valid body: only title and title_hy are required
const VALID_GUIDE = { title: 'Best Bars in Yerevan', title_hy: 'Լավագույն բարեր' }

describe('POST /api/guides', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({ tableResponses: { guides: { data: null, error: null } } }) as any
    )
  })

  it('[FAILURE] returns 429 when rate limited (before auth)', async () => {
    const limitedResponse = new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    vi.mocked(rateLimit).mockResolvedValueOnce({
      limited: true, remaining: 0, resetAt: 9999, toResponse: () => limitedResponse as any,
    })
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_GUIDE))
    expect(res.status).toBe(429)
  })

  it('[FAILURE] returns 401 when getCurrentAdmin returns null', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_GUIDE))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Unauthorized' })
  })

  it('[HAPPY] accepts request from regular admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)
    const res = await POST(makeRequest(VALID_GUIDE))
    expect(res.status).toBe(200)
  })

  it('[FAILURE] returns 400 with fieldErrors.title when title is missing', async () => {
    const res = await POST(makeRequest({ title_hy: 'Բառ' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Validation failed', fieldErrors: expect.any(Object) })
    expect(json.fieldErrors).toHaveProperty('title')
  })

  it('[FAILURE] returns 400 with fieldErrors.title_hy when title_hy is missing', async () => {
    const res = await POST(makeRequest({ title: 'Best Bars' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fieldErrors).toHaveProperty('title_hy')
  })

  it('[FAILURE] returns 400 with fieldErrors.cover_url when cover_url is not a valid URL', async () => {
    const res = await POST(makeRequest({ ...VALID_GUIDE, cover_url: 'not-a-url' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fieldErrors).toHaveProperty('cover_url')
  })

  it('[HAPPY] returns {ok:true} and inserts guide with title and title_hy', async () => {
    const client = makeMockSupabaseClient({ tableResponses: { guides: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    const res = await POST(makeRequest(VALID_GUIDE))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    expect(client.from).toHaveBeenCalledWith('guides')
    const chain = (client.from as any).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Best Bars in Yerevan', title_hy: 'Լավագույն բարեր' })
    )
  })

  it('[HAPPY] applies defaults: sort_order=0, is_active=true, venue_ids=[]', async () => {
    const client = makeMockSupabaseClient({ tableResponses: { guides: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    await POST(makeRequest(VALID_GUIDE))
    const chain = (client.from as any).mock.results[0].value
    const insertArg = chain.insert.mock.calls[0][0]
    expect(insertArg.sort_order).toBe(0)
    expect(insertArg.is_active).toBe(true)
    expect(insertArg.venue_ids).toEqual([])
  })

  it('[FAILURE] returns 500 when supabase insert returns an error', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: { guides: { data: null, error: { message: 'unique_violation' } } },
      }) as any
    )
    const res = await POST(makeRequest(VALID_GUIDE))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'unique_violation' })
  })
})
