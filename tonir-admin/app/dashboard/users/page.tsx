import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import UsersClient from './users-client'

export default async function UsersPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, player_id, name, email, phone, tier, yel_points, total_visits, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  return <UsersClient users={users ?? []} />
}
