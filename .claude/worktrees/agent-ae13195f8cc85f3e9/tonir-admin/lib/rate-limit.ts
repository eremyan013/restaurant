import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/current-admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  limit: number
  windowSecs: number
  /** Key only on IP — use for routes without an admin session. */
  ipOnly?: boolean
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  resetAt: number
  toResponse: (() => NextResponse) | null
}

// ---------------------------------------------------------------------------
// In-process sliding window store
// NOTE: resets on cold start; not shared across Vercel instances.
// Sufficient for the threat model (compromised admin session / UI loop).
// Migrate to @vercel/kv when moving to Vercel Pro or admin count > 20.
// ---------------------------------------------------------------------------

interface WindowEntry {
  timestamps: number[]
  windowMs: number
}

const store = new Map<string, WindowEntry>()

let pruneCounter = 0
const PRUNE_INTERVAL = 500

function pruneStore(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    const cutoff = now - entry.windowMs
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

// ---------------------------------------------------------------------------
// IP extraction (Vercel: x-forwarded-for is the real client IP)
// ---------------------------------------------------------------------------

function extractIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Call at the top of any route handler that needs rate limiting.
 *
 * @example
 * const rl = await rateLimit(request, RATE_CRITICAL)
 * if (rl.limited) return rl.toResponse!()
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { limit, windowSecs, ipOnly = false } = config
  const windowMs = windowSecs * 1000
  const now = Date.now()

  let key: string
  if (ipOnly) {
    key = `ip:${extractIp(req)}`
  } else {
    const admin = await getCurrentAdmin()
    key = admin ? `admin:${admin.id}` : `ip:${extractIp(req)}`
  }

  // Namespace by window size so different configs produce independent counters.
  const storeKey = `${key}:${windowSecs}`

  pruneCounter++
  if (pruneCounter >= PRUNE_INTERVAL) {
    pruneCounter = 0
    pruneStore()
  }

  let entry = store.get(storeKey)
  if (!entry) {
    entry = { timestamps: [], windowMs }
    store.set(storeKey, entry)
  }

  const cutoff = now - windowMs
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  const count = entry.timestamps.length
  const resetAt =
    entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0] + windowMs) / 1000)
      : Math.ceil((now + windowMs) / 1000)

  if (count >= limit) {
    const retryAfter = Math.max(1, resetAt - Math.ceil(now / 1000))
    return {
      limited: true,
      remaining: 0,
      resetAt,
      toResponse: () =>
        NextResponse.json(
          { error: 'Too many requests', retryAfter },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetAt),
            },
          },
        ),
    }
  }

  entry.timestamps.push(now)

  return {
    limited: false,
    remaining: limit - entry.timestamps.length,
    resetAt,
    toResponse: null,
  }
}

// ---------------------------------------------------------------------------
// Pre-built configs
// ---------------------------------------------------------------------------

/** 5 req / 60 s — send-push, send-otp, concierge AI */
export const RATE_CRITICAL: RateLimitConfig = { limit: 5, windowSecs: 60 }

/** 20 req / 60 s — file uploads */
export const RATE_UPLOAD: RateLimitConfig = { limit: 20, windowSecs: 60 }

/** 30 req / 60 s — general DB writes */
export const RATE_WRITE: RateLimitConfig = { limit: 30, windowSecs: 60 }

/** 60 req / 60 s — search / read queries */
export const RATE_READ: RateLimitConfig = { limit: 60, windowSecs: 60 }

/** 10 req / 60 s — reservations/notify (no admin session, IP-only) */
export const RATE_NOTIFY: RateLimitConfig = { limit: 10, windowSecs: 60, ipOnly: true }
