import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export const metadata: Metadata = { title: 'Venues — Tonir Admin' }
import { VenuesSearchTable } from '@/components/venues-search-table'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const admin = await getCurrentAdmin()
  if (!admin) return
  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(id)) return
  const supabase = createSupabaseAdminClient()
  await supabase.from('venues').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/venues')
}

export default async function VenuesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  const supabase = createSupabaseAdminClient()
  let venuesQuery = supabase
    .from('venues')
    .select('id, name, name_hy, name_ru, name_en, cuisine, area, kind, rating, is_active')
    .order('name')

  if (admin.role === 'admin') {
    if (!admin.managed_venue_ids.length) redirect('/dashboard')
    venuesQuery = venuesQuery.in('id', admin.managed_venue_ids)
  }

  const { data: venues, error } = await venuesQuery

  if (error) throw error

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {admin.role === 'admin' ? 'My Venues' : 'Venues'}
        </h1>
        {admin.role === 'super_admin' && (
          <Link
            href="/dashboard/venues/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            + New venue
          </Link>
        )}
      </div>

      {(venues ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          {admin.role === 'super_admin' ? (
            <>No venues yet. <a href="/dashboard/venues/new" className="text-zinc-900 font-medium hover:underline">Create one →</a></>
          ) : (
            'No venues assigned to your account. Contact a super-admin.'
          )}
        </div>
      ) : (
        <VenuesSearchTable
          venues={venues ?? []}
          toggleActive={toggleActive}
          isSuperAdmin={admin.role === 'super_admin'}
        />
      )}
    </div>
  )
}
