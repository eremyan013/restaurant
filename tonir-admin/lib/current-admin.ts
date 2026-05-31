import { createSupabaseSessionClient } from './supabase-session'
import { createSupabaseAdminClient } from './supabase-admin'

export type AdminRole = 'admin' | 'super_admin'

export interface CurrentAdmin {
  id: string
  name: string
  role: AdminRole
  managed_venue_id: string | null
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const session = await createSupabaseSessionClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return null

    const db = createSupabaseAdminClient()
    const { data } = await (db as any)
      .from('profiles')
      .select('id, name, role, managed_venue_id')
      .eq('id', user.id)
      .single()

    if (!data) return null
    if (data.role !== 'admin' && data.role !== 'super_admin') return null

    return data as CurrentAdmin
  } catch {
    return null
  }
}
