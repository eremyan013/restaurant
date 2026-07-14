import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export const metadata: Metadata = { title: 'Admins — Tonir Admin' }
import { CreateAdminForm } from './CreateAdminForm'
import { ConfirmButton } from '@/components/confirm-button'

async function removeAdmin(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const id = formData.get('id') as string
  if (!id) return

  const supabase = createSupabaseAdminClient()
  const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single()
  if (target?.role !== 'admin') return  // never demote super_admins via this action
  await supabase
    .from('profiles')
    .update({ role: 'user', managed_venue_ids: [], managed_venue_id: null, is_admin: false })
    .eq('id', id)
  await supabase.auth.admin.updateUserById(id, { ban_duration: '87600h' }).catch(() => {})

  revalidatePath('/dashboard/admins')
}

export default async function AdminsPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [{ data: admins }, { data: venues }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, email, managed_venue_ids, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false }),
    supabase
      .from('venues')
      .select('id, name')
      .order('name'),
  ])

  const venueMap: Record<string, string> = {}
  for (const v of (venues ?? [])) venueMap[v.id] = v.name

  type AdminRow = { id: string; name: string; email: string; managed_venue_ids: string[]; created_at: string }
  const adminRows = (admins ?? []) as AdminRow[]

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
                  {adminRows.map((a) => (
                    <tr key={a.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900">{a.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{a.email}</td>
                      <td className="px-4 py-3">
                        {(a.managed_venue_ids ?? []).length === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(a.managed_venue_ids ?? []).map(vid => (
                              <span key={vid} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                                {venueMap[vid] ?? vid}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admins/${a.id}/edit`}
                            className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors"
                          >
                            Edit
                          </Link>
                          <form action={removeAdmin}>
                            <input type="hidden" name="id" value={a.id} />
                            <ConfirmButton
                              message={`Remove ${a.name} as admin? Their account will be banned.`}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                            >
                              Remove
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create form */}
        <CreateAdminForm venues={venues ?? []} />
      </div>
    </div>
  )
}
