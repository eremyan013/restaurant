import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { BannerRow } from '@/lib/database.types'

export const metadata: Metadata = { title: 'Banners — Tonir Admin' }

async function createBanner(formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return

  const image_url = (formData.get('image_url') as string ?? '').trim()
  if (!image_url) return

  const supabase = createSupabaseAdminClient()
  const { data: maxRow } = await supabase
    .from('banners')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('banners').insert({
    image_url,
    title:      (formData.get('title') as string ?? '').trim() || null,
    subtitle:   (formData.get('subtitle') as string ?? '').trim() || null,
    tap_action: (formData.get('tap_action') as string) || 'none',
    tap_url:    (formData.get('tap_url') as string ?? '').trim() || null,
    start_date: (formData.get('start_date') as string ?? '').trim() || null,
    end_date:   (formData.get('end_date') as string ?? '').trim() || null,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  })
  revalidatePath('/dashboard/banners')
}

async function toggleBanner(id: string, is_active: boolean) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('banners').update({ is_active }).eq('id', id)
  revalidatePath('/dashboard/banners')
}

async function updateSortOrder(id: string, formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const sort_order = parseInt(formData.get('sort_order') as string, 10)
  if (isNaN(sort_order)) return
  const supabase = createSupabaseAdminClient()
  await supabase.from('banners').update({ sort_order }).eq('id', id)
  revalidatePath('/dashboard/banners')
}

async function deleteBanner(id: string) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('banners').delete().eq('id', id)
  revalidatePath('/dashboard/banners')
}

export default async function BannersPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })

  const banners: BannerRow[] = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Banners
          <span className="ml-2 text-sm font-normal text-zinc-400">{banners.length} total</span>
        </h1>
      </div>

      {banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center mb-8">
          <p className="text-zinc-400 text-sm">No banners yet. Add one below.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Preview</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Title</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Tap action</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Schedule</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Order</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="odd:bg-white even:bg-zinc-50 border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt="" className="w-20 h-10 object-cover rounded-md bg-zinc-100" />
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 max-w-[180px] truncate">
                    {b.title ?? <span className="text-zinc-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{b.tap_action}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {b.start_date || b.end_date
                      ? `${b.start_date ?? '∞'} → ${b.end_date ?? '∞'}`
                      : 'Always'}
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateSortOrder.bind(null, b.id)} className="flex items-center gap-2">
                      <input
                        type="number"
                        name="sort_order"
                        defaultValue={b.sort_order}
                        className="w-16 h-8 px-2 rounded border border-zinc-300 text-sm text-center"
                      />
                      <button type="submit"
                        className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium transition-colors">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleBanner.bind(null, b.id, !b.is_active)}>
                      <button type="submit" className="text-base leading-none focus:outline-none"
                        title={b.is_active ? 'Click to deactivate' : 'Click to activate'}>
                        {b.is_active ? '✓' : '✗'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteBanner.bind(null, b.id)}>
                      <button type="submit"
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors">
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

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Add banner</h2>
        <form action={createBanner} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Image URL *</label>
            <input name="image_url" required placeholder="https://…"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Title</label>
            <input name="title" placeholder="Optional overlay title"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Subtitle</label>
            <input name="subtitle" placeholder="Optional subtitle"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Tap action</label>
            <select name="tap_action"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="none">None</option>
              <option value="external_url">External URL</option>
              <option value="deep_link">Deep link</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Tap URL / deep link</label>
            <input name="tap_url" placeholder="https://… or venue/id or map"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Start date</label>
            <input name="start_date" type="date"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">End date</label>
            <input name="end_date" type="date"
              className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
