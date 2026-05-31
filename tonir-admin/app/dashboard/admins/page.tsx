import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

async function createAdmin(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const name     = (formData.get('name') as string).trim()
  const email    = (formData.get('email') as string).trim()
  const password = (formData.get('password') as string).trim()
  const venueId  = (formData.get('venue_id') as string).trim()

  if (!name || !email || !password || !venueId) return

  const supabase = createSupabaseAdminClient()

  // Create Supabase auth user
  const { data: created, error: authError } = await (supabase as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError || !created?.user) return

  // Create profile with admin role
  await (supabase as any).from('profiles').insert({
    id: created.user.id,
    name,
    email,
    role: 'admin',
    managed_venue_id: venueId,
    tier: 'Tonir',
    tier_level: 1,
    yel_points: 0,
    total_visits: 0,
    is_admin: true,
  })

  revalidatePath('/dashboard/admins')
}

async function deleteAdmin(id: string) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('profiles').update({ role: 'user', managed_venue_id: null, is_admin: false }).eq('id', id)
  revalidatePath('/dashboard/admins')
}

export default async function AdminsPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [{ data: admins }, { data: venues }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, name, email, managed_venue_id, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false }),
    (supabase as any)
      .from('venues')
      .select('id, name')
      .order('name'),
  ])

  const venueMap: Record<string, string> = {}
  for (const v of (venues ?? [])) venueMap[v.id] = v.name

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Restaurant Admins</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin list */}
        <div className="lg:col-span-2">
          {(!admins || admins.length === 0) ? (
            <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
              No restaurant admins yet. Create one using the form.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Email</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a: { id: string; name: string; email: string; managed_venue_id: string | null }) => (
                    <tr key={a.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{a.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                          {a.managed_venue_id ? (venueMap[a.managed_venue_id] ?? a.managed_venue_id) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={deleteAdmin.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            onClick={(e) => {
                              if (!confirm(`Remove admin access for ${a.name}?`)) e.preventDefault()
                            }}
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 h-fit">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Create Admin Account</h2>
          <form action={createAdmin} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Name</label>
              <input
                name="name"
                required
                placeholder="Restaurant name or manager"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@restaurant.am"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Venue</label>
              <select
                name="venue_id"
                required
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                <option value="">Select a venue…</option>
                {(venues ?? []).map((v: { id: string; name: string }) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Create Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
