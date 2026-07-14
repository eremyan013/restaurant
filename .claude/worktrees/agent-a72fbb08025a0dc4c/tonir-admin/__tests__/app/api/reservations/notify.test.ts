import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 9, resetAt: 0, toResponse: null }),
  RATE_NOTIFY: { limit: 10, windowSecs: 60 },
}))
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}))

import { POST, OPTIONS } from '@/app/api/reservations/notify/route'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'
import webpush from 'web-push'
import { makeMockSupabaseClient } from '../../helpers/supabase-mock'

beforeAll(() => {
  process.env.NOTIFY_SECRET = 'test-secret-value'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-pub'
  process.env.VAPID_PRIVATE_KEY = 'test-vapid-priv'
})

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/reservations/notify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const VALID_BODY = { venue_name: 'Tonir Main', date: '2026-07-01', time: '19:00', people: 4 }
const CORRECT_SECRET = { 'X-Notify-Secret': 'test-secret-value' }

describe('OPTIONS /api/reservations/notify', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})

describe('POST /api/reservations/notify — secret authentication', () => {
  it('[FAILURE] returns 401 when X-Notify-Secret header is missing', async () => {
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toMatchObject({ ok: false })
  })

  it('[FAILURE] returns 401 when X-Notify-Secret is wrong', async () => {
    const res = await POST(makeRequest(VALID_BODY, { 'X-Notify-Secret': 'wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('[FAILURE] returns 401 when NOTIFY_SECRET env var is not set', async () => {
    const original = process.env.NOTIFY_SECRET
    delete process.env.NOTIFY_SECRET
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(401)
    process.env.NOTIFY_SECRET = original
  })
})

describe('POST /api/reservations/notify — rate limiting', () => {
  it('[FAILURE] returns 429 when rate limited', async () => {
    const limitedResponse = new Response(JSON.stringify({ ok: false }), { status: 429 })
    vi.mocked(rateLimit).mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: 9999,
      toResponse: () => limitedResponse as any,
    })
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/reservations/notify — input validation', () => {
  beforeEach(() => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({ tableResponses: { profiles: { data: [], error: null } } }) as any
    )
    mockFetch.mockReset()
  })

  it('[FAILURE] returns 400 when venue_name is missing', async () => {
    const res = await POST(makeRequest({ date: '2026-07-01', time: '19:00' }, CORRECT_SECRET))
    expect(res.status).toBe(400)
  })

  it('[FAILURE] returns 400 when date is missing', async () => {
    const res = await POST(makeRequest({ venue_name: 'Tonir', time: '19:00' }, CORRECT_SECRET))
    expect(res.status).toBe(400)
  })

  it('[FAILURE] returns 400 when time is missing', async () => {
    const res = await POST(makeRequest({ venue_name: 'Tonir', date: '2026-07-01' }, CORRECT_SECRET))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/reservations/notify — happy paths', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('[HAPPY] returns {ok:true} when no admins have push tokens', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({ tableResponses: { profiles: { data: [], error: null } } }) as any
    )
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(200)
    expect((await res.json())).toMatchObject({ ok: true })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(vi.mocked(webpush.sendNotification)).not.toHaveBeenCalled()
  })

  it('[HAPPY] calls Expo fetch for admin with push_token', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: {
          profiles: { data: [{ push_token: 'ExponentPushToken[abc123]', web_push_sub: null }], error: null },
        },
      }) as any
    )
    mockFetch.mockResolvedValue({ ok: true } as Response)
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledWith('https://exp.host/--/api/v2/push/send', expect.objectContaining({ method: 'POST' }))
  })

  it('[HAPPY] calls webpush.sendNotification for admin with web_push_sub', async () => {
    const webSub = { endpoint: 'https://fcm.example.com/sub', keys: { p256dh: 'x', auth: 'y' } }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: {
          profiles: { data: [{ push_token: null, web_push_sub: webSub }], error: null },
        },
      }) as any
    )
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(200)
    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalledOnce()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('[HAPPY] sends both when admin has both push_token and web_push_sub', async () => {
    const webSub = { endpoint: 'https://fcm.example.com/sub', keys: { p256dh: 'x', auth: 'y' } }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: {
          profiles: { data: [{ push_token: 'ExponentPushToken[abc]', web_push_sub: webSub }], error: null },
        },
      }) as any
    )
    mockFetch.mockResolvedValue({ ok: true } as Response)
    await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('[HAPPY] notification body contains venue_name, date, time, people', async () => {
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: {
          profiles: { data: [{ push_token: 'ExponentPushToken[abc]', web_push_sub: null }], error: null },
        },
      }) as any
    )
    mockFetch.mockResolvedValue({ ok: true } as Response)
    await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.body).toContain('Tonir Main')
    expect(callBody.body).toContain('2026-07-01')
    expect(callBody.body).toContain('19:00')
    expect(callBody.body).toContain('4')
  })

  it('[EDGE] push errors are swallowed — route still returns 200', async () => {
    const webSub = { endpoint: 'https://fcm.example.com/sub', keys: { p256dh: 'x', auth: 'y' } }
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockSupabaseClient({
        tableResponses: {
          profiles: { data: [{ push_token: 'ExponentPushToken[abc]', web_push_sub: webSub }], error: null },
        },
      }) as any
    )
    mockFetch.mockRejectedValue(new Error('Network failure'))
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error('VAPID expired'))
    const res = await POST(makeRequest(VALID_BODY, CORRECT_SECRET))
    expect(res.status).toBe(200)
  })
})
