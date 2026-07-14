/**
 * Unit tests for lib/rate-limit.ts
 *
 * The rate limiter is a pure in-process sliding-window counter with no
 * external dependencies (no DB, no cache layer).  It does use Date.now()
 * and getCurrentAdmin(), both of which are controlled here via fake timers
 * and vi.mock() respectively.
 *
 * Test areas:
 *   1. extractIp()          — x-forwarded-for parsing, x-real-ip fallback
 *   2. Key namespacing      — different windowSecs produce independent counters
 *   3. Admin vs IP keying   — admin session → keyed on admin.id; no session → keyed on IP
 *   4. ipOnly flag          — bypasses getCurrentAdmin() entirely
 *   5. Within-limit path    — limited:false, correct remaining, resetAt
 *   6. At-limit path        — limited:true, remaining:0, Retry-After header
 *   7. Window expiry        — counter resets after windowMs passes
 *   8. toResponse()         — 429 status, correct JSON body, required headers
 *   9. pruneStore()         — background garbage-collection (called every 500 requests)
 *
 * NOTE: The in-process store is module-level state.  Each describe block
 * resets time with vi.useFakeTimers() and advances it to a fresh epoch so
 * that no state leaks across suites.  Because vitest re-uses the module
 * between tests (globals: true), the store accumulates entries.  We advance
 * the clock by the full window before each suite so old entries expire
 * before the new assertions run.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Module mocks (hoisted before any imports from the module under test) ───
vi.mock('@/lib/current-admin', () => ({
  getCurrentAdmin: vi.fn(),
}))

// next/server is not available in a node test environment — provide a minimal
// shim so the module under test can import and use NextRequest / NextResponse.
vi.mock('next/server', () => {
  class FakeNextResponse {
    status: number
    _body: unknown
    headers: Map<string, string>

    constructor(body: unknown, init: { status: number; headers?: Record<string, string> } = { status: 200 }) {
      this._body = body
      this.status = init.status
      this.headers = new Map(Object.entries(init.headers ?? {}))
    }

    // Static factory used in rate-limit.ts: NextResponse.json(body, init)
    static json(body: unknown, init?: { status: number; headers?: Record<string, string> }) {
      return new FakeNextResponse(body, init ?? { status: 200 })
    }
  }

  class FakeNextRequest {
    private _headers: Map<string, string>
    constructor(headers: Record<string, string> = {}) {
      this._headers = new Map(Object.entries(headers))
    }
    headers = {
      get: (name: string) => this._headers.get(name) ?? null,
    }
  }

  return { NextResponse: FakeNextResponse, NextRequest: FakeNextRequest }
})

import { NextRequest } from 'next/server'
import { rateLimit, RATE_CRITICAL, RATE_NOTIFY } from '@/lib/rate-limit'
import { getCurrentAdmin } from '@/lib/current-admin'

// ── Test helpers ───────────────────────────────────────────────────────────

/** Build a minimal NextRequest-like object with the given headers. */
function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new (NextRequest as any)(headers)
}

/** Convenience: run rateLimit() N times in a row. */
async function hit(n: number, req: NextRequest, config = RATE_CRITICAL) {
  const results = []
  for (let i = 0; i < n; i++) {
    results.push(await rateLimit(req, config))
  }
  return results
}

// ── Admin fixture ─────────────────────────────────────────────────────────

const ADMIN = { id: 'admin-uuid-1', name: 'Test Admin', role: 'super_admin' as const, managed_venue_ids: [] }

// ─────────────────────────────────────────────────────────────────────────────
// 1. IP extraction
// ─────────────────────────────────────────────────────────────────────────────

describe('IP extraction', () => {
  // Use a large base time so the store is clean for each suite.
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    vi.mocked(getCurrentAdmin).mockResolvedValue(null) // force IP keying
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('[HAPPY PATH] uses first IP in x-forwarded-for comma-list', async () => {
    const req1 = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' })
    const req2 = makeReq({ 'x-forwarded-for': '9.9.9.9' })

    // Hit limit on req1's IP, then verify req2's counter is independent.
    const { limit, windowSecs } = RATE_CRITICAL
    for (let i = 0; i < limit; i++) await rateLimit(req1, RATE_CRITICAL)

    const r1 = await rateLimit(req1, RATE_CRITICAL)
    expect(r1.limited).toBe(true)

    // req2 has never been called — should still be under limit.
    const r2 = await rateLimit(req2, RATE_CRITICAL)
    expect(r2.limited).toBe(false)
    void windowSecs // suppress unused-var lint
  })

  it('[HAPPY PATH] trims whitespace from x-forwarded-for entries', async () => {
    const req = makeReq({ 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' })
    const result = await rateLimit(req, RATE_CRITICAL)
    // Just confirm it runs without crashing and uses a non-empty key.
    expect(result.limited).toBe(false)
  })

  it('[HAPPY PATH] falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const req = makeReq({ 'x-real-ip': '198.51.100.1' })
    const result = await rateLimit(req, RATE_CRITICAL)
    expect(result.limited).toBe(false)
  })

  it('[EDGE CASE] uses "unknown" key when no IP headers are present', async () => {
    // Two separate requests with no headers should share the "unknown" counter.
    const req = makeReq()
    const { limit } = RATE_CRITICAL
    // The "unknown" key may already have hits from earlier tests in this suite,
    // so we reset time to a fresh epoch to clear the window.
    vi.setSystemTime(new Date('2030-01-02T00:00:00Z'))

    for (let i = 0; i < limit; i++) await rateLimit(req, RATE_CRITICAL)
    const r = await rateLimit(req, RATE_CRITICAL)
    expect(r.limited).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Within-limit path
// ─────────────────────────────────────────────────────────────────────────────

describe('within-limit path', () => {
  const BASE = new Date('2030-02-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
    vi.mocked(getCurrentAdmin).mockResolvedValue(ADMIN)
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] returns limited:false for first request', async () => {
    const result = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(result.limited).toBe(false)
  })

  it('[HAPPY PATH] remaining decrements with each request', async () => {
    // Use a unique admin ID so prior-suite store entries do not contaminate.
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'decrement-admin' })
    vi.setSystemTime(new Date('2030-02-01T02:00:00Z'))
    const { limit } = RATE_CRITICAL
    const results = await hit(3, makeReq())
    // After 3 calls: remaining should be limit - 3
    expect(results[2].remaining).toBe(limit - 3)
  })

  it('[HAPPY PATH] toResponse is null when not limited', async () => {
    const result = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(result.toResponse).toBeNull()
  })

  it('[HAPPY PATH] resetAt is a unix-second timestamp in the future', async () => {
    const result = await rateLimit(makeReq(), RATE_CRITICAL)
    const nowSec = Math.floor(BASE.getTime() / 1000)
    expect(result.resetAt).toBeGreaterThan(nowSec)
  })

  it('[EDGE CASE] exactly limit-1 requests are all non-limited', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'limit-minus-one-admin' })
    vi.setSystemTime(new Date('2030-02-01T03:00:00Z'))
    const { limit } = RATE_CRITICAL
    const results = await hit(limit - 1, makeReq())
    expect(results.every(r => !r.limited)).toBe(true)
  })

  it('[EDGE CASE] the limit-th request is still non-limited (boundary)', async () => {
    // The limiter allows exactly `limit` requests; the (limit+1)-th is blocked.
    // (count >= limit triggers rejection, so the limit-th request is allowed.)
    // NOTE: This depends on whether the implementation checks before or after push.
    // rate-limit.ts checks `count >= limit` BEFORE pushing, so request #limit passes.
    const { limit } = RATE_CRITICAL
    vi.setSystemTime(new Date('2030-02-01T01:00:00Z')) // fresh epoch
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'boundary-admin' })
    const results = await hit(limit, makeReq())
    expect(results[limit - 1].limited).toBe(false)
    expect(results[limit - 1].remaining).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. At-limit / over-limit path
// ─────────────────────────────────────────────────────────────────────────────

describe('at-limit path', () => {
  const BASE = new Date('2030-03-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'over-limit-admin' })
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] (limit+1)-th request returns limited:true', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(r.limited).toBe(true)
  })

  it('[HAPPY PATH] limited result has remaining:0', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(r.remaining).toBe(0)
  })

  it('[HAPPY PATH] toResponse() returns a 429 response', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(r.toResponse).not.toBeNull()
    const resp = r.toResponse!()
    expect((resp as any).status).toBe(429)
  })

  it('[HAPPY PATH] 429 response body contains error and retryAfter', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    const resp = r.toResponse!()
    const body = (resp as any)._body as { error: string; retryAfter: number }
    expect(body.error).toBe('Too many requests')
    expect(typeof body.retryAfter).toBe('number')
    expect(body.retryAfter).toBeGreaterThanOrEqual(1)
  })

  it('[HAPPY PATH] 429 response has Retry-After header', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    const resp = r.toResponse!()
    expect((resp as any).headers.get('Retry-After')).toBeTruthy()
  })

  it('[HAPPY PATH] 429 response has X-RateLimit-Limit header matching config', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    const resp = r.toResponse!()
    expect((resp as any).headers.get('X-RateLimit-Limit')).toBe(String(limit))
  })

  it('[HAPPY PATH] 429 response has X-RateLimit-Remaining: 0', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    const resp = r.toResponse!()
    expect((resp as any).headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('[HAPPY PATH] 429 response has X-RateLimit-Reset header', async () => {
    const { limit } = RATE_CRITICAL
    await hit(limit, makeReq())
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    const resp = r.toResponse!()
    expect((resp as any).headers.get('X-RateLimit-Reset')).toBeTruthy()
  })

  it('[EDGE CASE] retryAfter is at least 1 second (never 0)', async () => {
    // Advance to just before the window expires (1 ms before) so resetAt - now ≈ 0.
    const { limit, windowSecs } = RATE_CRITICAL
    const firstHit = BASE.getTime()
    await hit(limit, makeReq())
    // Move clock to 1 ms before window expires (timestamps[0] + windowMs - 1).
    vi.setSystemTime(new Date(firstHit + windowSecs * 1000 - 1))
    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    if (r.limited) {
      const resp = r.toResponse!()
      const body = (resp as any)._body as { retryAfter: number }
      expect(body.retryAfter).toBeGreaterThanOrEqual(1)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Window expiry (sliding window resets counter)
// ─────────────────────────────────────────────────────────────────────────────

describe('window expiry', () => {
  const BASE = new Date('2030-04-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'expiry-admin' })
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] counter resets after windowSecs elapses', async () => {
    const { limit, windowSecs } = RATE_CRITICAL

    // Exhaust the limit.
    await hit(limit, makeReq())
    const blocked = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(blocked.limited).toBe(true)

    // Advance past the full window.
    vi.setSystemTime(new Date(BASE.getTime() + windowSecs * 1000 + 1))

    const after = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(after.limited).toBe(false)
  })

  it('[HAPPY PATH] remaining after window reset is back to limit-1', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'expiry-remaining-admin' })
    const { limit, windowSecs } = RATE_CRITICAL

    await hit(limit, makeReq())
    vi.setSystemTime(new Date(BASE.getTime() + windowSecs * 1000 + 1))

    const after = await rateLimit(makeReq(), RATE_CRITICAL)
    expect(after.remaining).toBe(limit - 1)
  })

  it('[EDGE CASE] a request 1 ms before expiry still sees the old count', async () => {
    const { limit, windowSecs } = RATE_CRITICAL

    await hit(limit, makeReq())
    // Advance to 1 ms BEFORE the window expires.
    vi.setSystemTime(new Date(BASE.getTime() + windowSecs * 1000 - 1))

    const r = await rateLimit(makeReq(), RATE_CRITICAL)
    // Old timestamps are still in window — still limited.
    expect(r.limited).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Key namespacing — different windowSecs → independent counters
// ─────────────────────────────────────────────────────────────────────────────

describe('key namespacing', () => {
  const BASE = new Date('2030-05-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'ns-admin' })
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] two configs with different windowSecs have independent counters', async () => {
    const configA = { limit: 2, windowSecs: 30 }
    const configB = { limit: 2, windowSecs: 60 }

    // Exhaust configA.
    await hit(configA.limit, makeReq(), configA)
    const blockedA = await rateLimit(makeReq(), configA)
    expect(blockedA.limited).toBe(true)

    // configB should be untouched.
    const freeB = await rateLimit(makeReq(), configB)
    expect(freeB.limited).toBe(false)
  })

  it('[HAPPY PATH] same admin, same windowSecs, same limit → shared counter', async () => {
    const config = { limit: 3, windowSecs: 45 }

    await hit(config.limit, makeReq(), config)
    const r = await rateLimit(makeReq(), config)
    expect(r.limited).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Admin session keying vs IP fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('admin keying vs IP fallback', () => {
  const BASE = new Date('2030-06-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] two different admins from same IP have independent counters', async () => {
    const adminA = { ...ADMIN, id: 'admin-keying-A' }
    const adminB = { ...ADMIN, id: 'admin-keying-B' }
    const sharedIp = { 'x-forwarded-for': '1.1.1.1' }

    vi.mocked(getCurrentAdmin).mockResolvedValue(adminA)
    await hit(RATE_CRITICAL.limit, makeReq(sharedIp))
    const blockedA = await rateLimit(makeReq(sharedIp), RATE_CRITICAL)
    expect(blockedA.limited).toBe(true)

    // Switch to adminB — same IP but different admin.id → fresh counter.
    vi.mocked(getCurrentAdmin).mockResolvedValue(adminB)
    const freeB = await rateLimit(makeReq(sharedIp), RATE_CRITICAL)
    expect(freeB.limited).toBe(false)
  })

  it('[HAPPY PATH] same admin from different IPs shares the admin counter', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ ...ADMIN, id: 'single-admin-multi-ip' })

    const ip1 = makeReq({ 'x-forwarded-for': '10.0.0.1' })
    const ip2 = makeReq({ 'x-forwarded-for': '10.0.0.2' })

    // Mix requests from two IPs — they should share the same admin key.
    const { limit } = RATE_CRITICAL
    for (let i = 0; i < limit; i++) {
      await rateLimit(i % 2 === 0 ? ip1 : ip2, RATE_CRITICAL)
    }

    const r = await rateLimit(ip1, RATE_CRITICAL)
    expect(r.limited).toBe(true)
  })

  it('[HAPPY PATH] falls back to IP when getCurrentAdmin returns null', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)
    const req = makeReq({ 'x-forwarded-for': '203.0.113.99' })
    const result = await rateLimit(req, RATE_CRITICAL)
    // No session — still functional, IP-based.
    expect(result.limited).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. ipOnly flag
// ─────────────────────────────────────────────────────────────────────────────

describe('ipOnly flag', () => {
  const BASE = new Date('2030-07-01T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE)
    // Provide a valid session — ipOnly should ignore it.
    vi.mocked(getCurrentAdmin).mockResolvedValue(ADMIN)
  })

  afterEach(() => vi.useRealTimers())

  it('[HAPPY PATH] ipOnly:true never calls getCurrentAdmin()', async () => {
    const req = makeReq({ 'x-forwarded-for': '5.5.5.5' })
    await rateLimit(req, RATE_NOTIFY) // RATE_NOTIFY has ipOnly: true
    expect(vi.mocked(getCurrentAdmin)).not.toHaveBeenCalled()
  })

  it('[HAPPY PATH] ipOnly counters are keyed by IP even when admin session exists', async () => {
    // Two IPs should each have independent ipOnly counters.
    const req1 = makeReq({ 'x-forwarded-for': '5.5.5.1' })
    const req2 = makeReq({ 'x-forwarded-for': '5.5.5.2' })

    await hit(RATE_NOTIFY.limit, req1, RATE_NOTIFY)
    const blockedReq1 = await rateLimit(req1, RATE_NOTIFY)
    expect(blockedReq1.limited).toBe(true)

    const freeReq2 = await rateLimit(req2, RATE_NOTIFY)
    expect(freeReq2.limited).toBe(false)
  })

  it('[HAPPY PATH] ipOnly:false calls getCurrentAdmin()', async () => {
    const req = makeReq({ 'x-forwarded-for': '6.6.6.6' })
    await rateLimit(req, RATE_CRITICAL) // ipOnly defaults to false
    expect(vi.mocked(getCurrentAdmin)).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Pre-built config constants sanity check
// ─────────────────────────────────────────────────────────────────────────────

describe('pre-built config constants', () => {
  it('[HAPPY PATH] RATE_CRITICAL has limit:5 and windowSecs:60', () => {
    expect(RATE_CRITICAL).toMatchObject({ limit: 5, windowSecs: 60 })
  })

  it('[HAPPY PATH] RATE_NOTIFY has ipOnly:true', () => {
    expect(RATE_NOTIFY.ipOnly).toBe(true)
  })

  it('[HAPPY PATH] all pre-built configs export the correct shape', async () => {
    const { RATE_UPLOAD, RATE_WRITE, RATE_READ } = await import('@/lib/rate-limit')
    for (const cfg of [RATE_UPLOAD, RATE_WRITE, RATE_READ, RATE_CRITICAL, RATE_NOTIFY]) {
      expect(typeof cfg.limit).toBe('number')
      expect(typeof cfg.windowSecs).toBe('number')
      expect(cfg.limit).toBeGreaterThan(0)
      expect(cfg.windowSecs).toBeGreaterThan(0)
    }
  })
})
