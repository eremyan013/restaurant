import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/current-admin', () => ({ getCurrentAdmin: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 29, resetAt: 0, toResponse: null }),
  RATE_WRITE: { limit: 30, windowSecs: 60 },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/menu-items/route'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'
import { makeMockSupabaseClient, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/menu-items', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_ITEM = {
  venue_id:    'b0000000-0000-4000-a000-000000000001',
  category_id: 'c0000000-0000-4000-a000-000000000001',
  name:        'Khinkali',
  price:       350,
}

describe('POST /api/menu-items', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({ tableResponses: { menu_items: { data: null, error: null } } }) as any
    )
  })

  it('[FAILURE] returns 429 when rate limited', async () => {
    const limitedResponse = new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    vi.mocked(rateLimit).mockResolvedValueOnce({
      limited: true, remaining: 0, resetAt: 9999, toResponse: () => limitedResponse as any,
    })
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_ITEM))
    expect(res.status).toBe(429)
  })

  it('[FAILURE] returns 401 when getCurrentAdmin returns null', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_ITEM))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Unauthorized' })
  })

  it('[HAPPY] accepts request from regular admin', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)
    const res = await POST(makeRequest(VALID_ITEM))
    expect(res.status).toBe(200)
  })

  it('[HAPPY] returns {ok:true} and inserts into menu_items', async () => {
    const client = makeMockSupabaseClient({ tableResponses: { menu_items: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    const res = await POST(makeRequest(VALID_ITEM))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    expect(client.from).toHaveBeenCalledWith('menu_items')
    const chain = (client.from as any).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ venue_id: VALID_ITEM.venue_id, name: 'Khinkali', price: 350, is_available: true })
    )
  })

  it('[HAPPY] applies defaults: is_available=true, is_popular=false, allergens=[], sort_order=0', async () => {
    const client = makeMockSupabaseClient({ tableResponses: { menu_items: { data: null, error: null } } })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
    await POST(makeRequest(VALID_ITEM))
    const chain = (client.from as any).mock.results[0].value
    const arg = chain.insert.mock.calls[0][0]
    expect(arg.is_available).toBe(true)
    expect(arg.is_popular).toBe(false)
    expect(arg.allergens).toEqual([])
    expect(arg.sort_order).toBe(0)
  })

  it('[HAPPY] calls revalidatePath with correct venue-specific path', async () => {
    await POST(makeRequest(VALID_ITEM))
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/dashboard/menus/${VALID_ITEM.venue_id}`)
  })

  it('[FAILURE] returns 500 when supabase insert returns an error', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: { menu_items: { data: null, error: { message: 'foreign_key_violation' } } },
      }) as any
    )
    const res = await POST(makeRequest(VALID_ITEM))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'foreign_key_violation' })
  })
})
