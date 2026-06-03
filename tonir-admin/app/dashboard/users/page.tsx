import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export default async function UsersPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name, email, tier, yel_points, total_visits, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Users</h1>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Email</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tier</th>
              <th className="px-4 py-3 font-medium text-zinc-500">YEL</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Visits</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(user => (
              <tr
                key={user.id}
                className="relative odd:bg-white even:bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <Link href={`/dashboard/users/${user.id}`} className="hover:text-zinc-600 after:absolute after:inset-0">
                    {user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                    {user.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.yel_points}</td>
                <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.total_visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
