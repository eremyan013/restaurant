import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { LocationRow } from '@/lib/database.types'

export const metadata: Metadata = { title: 'Locations — Tonir Admin' }

async function toggleLocationActive(id: string, currentValue: boolean) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('locations').update({ is_active: !currentValue }).eq('id', id)
  revalidatePath('/dashboard/locations')
}

export default async function LocationsPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('locations')
    .select('*')
    .order('sort_order', { ascending: true })

  const locations: LocationRow[] = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Locations</h1>
        <Link
          href="/dashboard/locations/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          + New location
        </Link>
      </div>

      {locations.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No locations yet.</p>
          <Link
            href="/dashboard/locations/new"
            className="mt-3 inline-block text-sm text-zinc-900 font-medium hover:underline"
          >
            Create your first location →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Location List</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Armenian name</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Russian name</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">English name</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Sort order</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{loc.name_hy}</td>
                  <td className="px-4 py-3 text-zinc-600">{loc.name_ru}</td>
                  <td className="px-4 py-3 text-zinc-600">{loc.name_en}</td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{loc.sort_order}</td>
                  <td className="px-4 py-3">
                    <form action={toggleLocationActive.bind(null, loc.id, loc.is_active)}>
                      <button
                        type="submit"
                        className="text-base leading-none focus:outline-none"
                        title={loc.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {loc.is_active ? '✓' : '✗'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/locations/${loc.id}`}
                      className="w-20 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors text-center"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
