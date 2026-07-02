import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export const metadata: Metadata = { title: 'Venues — Tonir Admin' }
import { VenuesSearchTable } from '@/components/venues-search-table'

async function toggleActive(id: string, current: boolean): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }
  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(id)) return { ok: false, error: 'Unauthorized' }
  const supabase = createSupabaseAdminClient()
  const { error: dbError } = await supabase.from('venues').update({ is_active: !current }).eq('id', id)
  if (dbError) return { ok: false, error: dbError.message }
  revalidatePath('/dashboard/venues')
  return { ok: true }
}

export default async function VenuesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  const supabase = createSupabaseAdminClient()
  let venuesQuery = supabase
    .from('venues')
    .select('id, name, name_hy, name_ru, name_en, cuisine, area, kind, is_active')
    .order('name')

  if (admin.role === 'admin') {
    if (!admin.managed_venue_ids.length) redirect('/dashboard')
    venuesQuery = venuesQuery.in('id', admin.managed_venue_ids)
  }

  const [{ data: venues, error }, { data: reviewRows }] = await Promise.all([
    venuesQuery,
    supabase.from('reviews').select('venue_id, rating').eq('status', 'approved'),
  ])

  if (error) throw error

  // Compute real average rating per venue from approved reviews
  const ratingMap: Record<string, { avg: number; count: number }> = {}
  for (const r of (reviewRows ?? [])) {
    if (!ratingMap[r.venue_id]) ratingMap[r.venue_id] = { avg: 0, count: 0 }
    ratingMap[r.venue_id].count += 1
    ratingMap[r.venue_id].avg += r.rating
  }
  for (const id of Object.keys(ratingMap)) {
    const { avg, count } = ratingMap[id]
    ratingMap[id].avg = Math.round((avg / count) * 10) / 10
  }

  const venuesWithRating = (venues ?? []).map(v => ({
    ...v,
    rating: ratingMap[v.id]?.avg ?? null,
    reviews_count: ratingMap[v.id]?.count ?? 0,
  }))

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

      {venuesWithRating.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          {admin.role === 'super_admin' ? (
            <>No venues yet. <a href="/dashboard/venues/new" className="text-zinc-900 font-medium hover:underline">Create one →</a></>
          ) : (
            'No venues assigned to your account. Contact a super-admin.'
          )}
        </div>
      ) : (
        <VenuesSearchTable
          venues={venuesWithRating}
          toggleActive={toggleActive}
          isSuperAdmin={admin.role === 'super_admin'}
        />
      )}
    </div>
  )
}
