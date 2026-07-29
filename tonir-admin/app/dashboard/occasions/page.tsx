import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { OccasionRow } from '@/lib/database.types'

export const metadata: Metadata = { title: 'Occasions — Tonir Admin' }

async function createOccasion(formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return

  const name_hy = (formData.get('name_hy') as string ?? '').trim()
  const name_ru = (formData.get('name_ru') as string ?? '').trim()
  const name_en = (formData.get('name_en') as string ?? '').trim()
  if (!name_hy || !name_ru || !name_en) return

  const supabase = createSupabaseAdminClient()
  const { data: maxRow } = await supabase
    .from('occasions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('occasions').insert({
    name_hy, name_ru, name_en,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  })
  revalidatePath('/dashboard/occasions')
}

async function deleteOccasion(id: string) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('occasions').delete().eq('id', id)
  revalidatePath('/dashboard/occasions')
}

async function toggleOccasion(id: string, is_active: boolean) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('occasions').update({ is_active }).eq('id', id)
  revalidatePath('/dashboard/occasions')
}

export default async function OccasionsPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('occasions')
    .select('*')
    .order('sort_order', { ascending: true })

  const occasions: OccasionRow[] = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Occasions
          <span className="ml-2 text-sm font-normal text-zinc-400">{occasions.length} total</span>
        </h1>
      </div>

      {/* Table */}
      {occasions.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No occasions yet. Add one below.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">English</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Armenian</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Russian</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {occasions.map((occ) => (
                <tr
                  key={occ.id}
                  className="odd:bg-white even:bg-zinc-50 border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{occ.name_en}</td>
                  <td className="px-4 py-3 text-zinc-600">{occ.name_hy}</td>
                  <td className="px-4 py-3 text-zinc-600">{occ.name_ru}</td>
                  <td className="px-4 py-3">
                    <form action={toggleOccasion.bind(null, occ.id, !occ.is_active)}>
                      <button
                        type="submit"
                        className="text-base leading-none focus:outline-none"
                        title={occ.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {occ.is_active ? '✓' : '✗'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteOccasion.bind(null, occ.id)}>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Add occasion</h2>
        <form action={createOccasion} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">English *</label>
            <input
              name="name_en"
              required
              placeholder="e.g. Birthday"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Armenian *</label>
            <input
              name="name_hy"
              required
              placeholder="e.g. Ծնունդ"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Russian *</label>
            <input
              name="name_ru"
              required
              placeholder="e.g. День рождения"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
