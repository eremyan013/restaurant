/**
 * Unit tests for app/api/concierge/escalate/route.ts
 *
 * This route handles concierge session escalation.
 * Key behaviors:
 *   - OPTIONS returns 204 with correct CORS headers
 *   - POST requires authentication (any admin role)
 *   - POST requires session_id in request body
 *   - POST updates session status to 'escalated'
 *   - All responses include CORS headers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/current-admin',  () => ({ getCurrentAdmin: vi.fn() }))

import { POST, OPTIONS } from '@/app/api/concierge/escalate/route'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { makeMockSupabaseClient, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

function makePOSTRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/concierge/escalate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('OPTIONS /api/concierge/escalate', () => {
  it('[HAPPY PATH] returns 204 with CORS headers', async () => {
    const res = await OPTIONS()

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})

describe('POST /api/concierge/escalate', () => {
  let client: ReturnType<typeof makeMockSupabaseClient>

  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    client = makeMockSupabaseClient({
      tableResponses: { concierge_sessions: { data: null, error: null } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
  })

  // ── Authorization ──────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 403 for unauthenticated requests', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const res = await POST(makePOSTRequest({ session_id: 'sess-123' }))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Forbidden' })
  })

  it('[HAPPY PATH] regular admin can escalate (any authenticated admin is allowed)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const res = await POST(makePOSTRequest({ session_id: 'sess-123' }))

    expect(res.status).toBe(200)
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 400 when session_id is missing', async () => {
    const res = await POST(makePOSTRequest({}))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'session_id required' })
  })

  it('[FAILURE SCENARIO] returns 400 when session_id is empty string', async () => {
    const res = await POST(makePOSTRequest({ session_id: '' }))

    expect(res.status).toBe(400)
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] returns {ok:true} with CORS headers when session_id is provided', async () => {
    const res = await POST(makePOSTRequest({ session_id: 'session-uuid-123' }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('[HAPPY PATH] updates the correct session to status "escalated"', async () => {
    const res = await POST(makePOSTRequest({ session_id: 'sess-abc' }))

    expect(res.status).toBe(200)
    expect(client.from).toHaveBeenCalledWith('concierge_sessions')
    const chain = (client.from as any).mock.results[0].value
    expect(chain.update).toHaveBeenCalledWith({ status: 'escalated' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'sess-abc')
  })
})
