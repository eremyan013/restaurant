/**
 * Shared Supabase mock utilities for tonir-admin tests.
 *
 * makeChain()  — creates a chainable query builder mock where every
 *                chainable method returns `this` and terminal methods
 *                (.single, .maybeSingle, direct await) resolve with `result`.
 *
 * makeMockSupabaseClient() — creates a full admin client mock with
 *                configurable per-table responses (sequential or fixed).
 */
import { vi } from 'vitest'

export interface QueryResult {
  data?: any
  error?: { message: string } | null
  count?: number
}

/**
 * Creates a chainable Supabase query builder mock.
 * All chainable filter/modifier methods return `this`.
 * Awaiting the chain directly (e.g. for mutations) resolves with `result`.
 */
export function makeChain(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, any> = {
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    delete:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    neq:         vi.fn().mockReturnThis(),
    not:         vi.fn().mockReturnThis(),
    or:          vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    lte:         vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    is:          vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    // Allow `await chain` without calling .single()
    then:   (res: any, rej?: any) => Promise.resolve(result).then(res, rej),
    catch:  (rej: any) => Promise.resolve(result).catch(rej),
    finally:(fin: any) => Promise.resolve(result).finally(fin),
  }
  return chain
}

export interface MockSupabaseOptions {
  /**
   * Map of table name → QueryResult (constant) or QueryResult[] (returned
   * in round-robin order on repeated calls to `.from(tableName)`).
   */
  tableResponses?: Record<string, QueryResult | QueryResult[]>
  /** Override auth.admin responses. */
  auth?: {
    createUser?: object
    updateUserById?: object
    deleteUser?: object
  }
  /** Override storage responses. */
  storage?: {
    uploadError?: { message: string } | null
    publicUrl?: string
  }
}

/**
 * Creates a mock Supabase admin client.
 *
 * Usage:
 *   const client = makeMockSupabaseClient({
 *     tableResponses: {
 *       profiles: [
 *         { data: { id: 'u1', role: 'super_admin' }, error: null }, // 1st call
 *         { data: null, error: null },                              // 2nd call
 *       ],
 *     },
 *   })
 *   vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
 */
export function makeMockSupabaseClient(opts: MockSupabaseOptions = {}) {
  const { tableResponses = {}, auth = {}, storage = {} } = opts
  const callIndex: Record<string, number> = {}

  const uploadError = storage.uploadError !== undefined ? storage.uploadError : null
  const publicUrl = storage.publicUrl ?? 'https://test.supabase.co/storage/v1/object/public/venue-photos/test-uuid.jpg'

  return {
    from: vi.fn((table: string) => {
      const idx = callIndex[table] ?? 0
      callIndex[table] = idx + 1

      const resp = tableResponses[table]
      if (resp === undefined) return makeChain()
      if (Array.isArray(resp)) return makeChain(resp[idx % resp.length] as QueryResult)
      return makeChain(resp as QueryResult)
    }),

    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl } })),
      })),
    },

    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          auth.createUser ?? { data: { user: { id: 'new-user-uuid' } }, error: null }
        ),
        updateUserById: vi.fn().mockResolvedValue(
          auth.updateUserById ?? { error: null }
        ),
        deleteUser: vi.fn().mockResolvedValue(
          auth.deleteUser ?? { error: null }
        ),
      },
    },
  }
}

/** Convenience: FormData builder for server action tests. */
export function makeFormData(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    if (Array.isArray(val)) {
      val.forEach(v => fd.append(key, v))
    } else {
      fd.set(key, val)
    }
  }
  return fd
}

/** Fixture admin objects. */
export const SUPER_ADMIN = {
  id: 'admin-super-1',
  name: 'Super Admin',
  role: 'super_admin' as const,
  managed_venue_ids: [],
}

export const REGULAR_ADMIN = {
  id: 'admin-regular-1',
  name: 'Regular Admin',
  role: 'admin' as const,
  managed_venue_ids: ['b0000000-0000-4000-a000-000000000001'],
}
