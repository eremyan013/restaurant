import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { NotificationsForm } from './notifications-form'

export default async function NotificationsPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [usersWithToken, totalUsers, venues] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('push_token', 'is', null)
      .then(({ count }: { count: number | null }) => count ?? 0),
    (supabase as any)
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .then(({ count }: { count: number | null }) => count ?? 0),
    (supabase as any)
      .from('venues')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }: { data: { id: string; name: string }[] | null }) => data ?? []),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Push Notifications</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Send targeted or broadcast notifications to app users.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Reachable Users</p>
          <p className="text-3xl font-semibold mt-1 text-zinc-900 tabular-nums">{usersWithToken}</p>
          <p className="text-xs text-zinc-400 mt-1">have push token</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Total Users</p>
          <p className="text-3xl font-semibold mt-1 text-zinc-900 tabular-nums">{totalUsers}</p>
          <p className="text-xs text-zinc-400 mt-1">registered accounts</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Coverage</p>
          <p className="text-3xl font-semibold mt-1 text-zinc-900 tabular-nums">
            {totalUsers > 0 ? Math.round((usersWithToken / totalUsers) * 100) : 0}%
          </p>
          <p className="text-xs text-zinc-400 mt-1">of users reachable</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Active Venues</p>
          <p className="text-3xl font-semibold mt-1 text-zinc-900 tabular-nums">{venues.length}</p>
          <p className="text-xs text-zinc-400 mt-1">available for targeting</p>
        </div>
      </div>

      <NotificationsForm venues={venues} />
    </div>
  )
}
