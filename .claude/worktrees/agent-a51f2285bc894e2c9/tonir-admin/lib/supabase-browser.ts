import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Browser-side Supabase client.
 * Use this in Client Components for auth (sign in, sign out) and
 * any client-side Supabase queries.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
