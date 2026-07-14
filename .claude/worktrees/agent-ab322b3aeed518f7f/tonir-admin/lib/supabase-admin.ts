import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Service-role Supabase client that bypasses all RLS policies.
 * Only use this in server-side code (Server Components, Server Actions, Route Handlers).
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
