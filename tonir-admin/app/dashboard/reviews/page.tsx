import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { requirePagePermission, assertPermission } from '@/lib/permissions'

export const metadata: Metadata = { title: 'Reviews — Tonir Admin' }
import { logActivity } from '@/lib/log-activity'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'
import { ReviewActionButtons } from '@/components/review-actions-client'
import type { Database, ReviewRow } from '@/lib/database.types'

type StatusFilter = 'all' | 'pending' | 'approved' | 'hidden'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  hidden:   'bg-zinc-100 text-zinc-500',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function recalcVenueRating(supabase: SupabaseClient<Database>, venueId: string) {
  if (!UUID_RE.test(venueId)) return

  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('venue_id', venueId)
    .eq('status', 'approved')

  const rows: { rating: number }[] = data ?? []
  const count = rows.length
  const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0

  await supabase
    .from('venues')
    .update({ rating: Math.round(avg * 10) / 10, reviews_count: count })
    .eq('id', venueId)
}

async function approveReview(id: string, venueId: string): Promise<{ error?: string }> {
  'use server'
  try {
    const actor = await getCurrentAdmin()
    if (!actor) return { error: 'Not authenticated' }
    if (actor.role !== 'super_admin') {
      const granted = await assertPermission(actor, 'reviews', 'moderate')
      if (!granted) return { error: 'Permission denied' }
    }
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('reviews').update({ status: 'approved' }).eq('id', id)
    if (error) return { error: error.message }
    await recalcVenueRating(supabase, venueId)
    const venueName = UUID_RE.test(venueId)
      ? (await supabase.from('venues').select('name').eq('id', venueId).single()).data?.name ?? venueId
      : venueId
    await logActivity(actor, 'approve_review', 'review', id, venueName)
    revalidatePath('/dashboard/reviews')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function hideReview(id: string, venueId: string): Promise<{ error?: string }> {
  'use server'
  try {
    const actor = await getCurrentAdmin()
    if (!actor) return { error: 'Not authenticated' }
    if (actor.role !== 'super_admin') {
      const granted = await assertPermission(actor, 'reviews', 'moderate')
      if (!granted) return { error: 'Permission denied' }
    }
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('reviews').update({ status: 'hidden' }).eq('id', id)
    if (error) return { error: error.message }
    await recalcVenueRating(supabase, venueId)
    const venueName = UUID_RE.test(venueId)
      ? (await supabase.from('venues').select('name').eq('id', venueId).single()).data?.name ?? venueId
      : venueId
    await logActivity(actor, 'hide_review', 'review', id, venueName)
    revalidatePath('/dashboard/reviews')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function deleteReview(id: string, venueId: string): Promise<{ error?: string }> {
  'use server'
  try {
    const actor = await getCurrentAdmin()
    if (!actor) return { error: 'Not authenticated' }
    if (actor.role !== 'super_admin') {
      const granted = await assertPermission(actor, 'reviews', 'moderate')
      if (!granted) return { error: 'Permission denied' }
    }
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) return { error: error.message }
    await recalcVenueRating(supabase, venueId)
    const venueName = UUID_RE.test(venueId)
      ? (await supabase.from('venues').select('name').eq('id', venueId).single()).data?.name ?? venueId
      : venueId
    await logActivity(actor, 'delete_review', 'review', id, venueName)
    revalidatePath('/dashboard/reviews')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'reviews', 'view')

  const { status: rawStatus, page: rawPage } = await searchParams
  const filter: StatusFilter =
    rawStatus === 'pending' || rawStatus === 'approved' || rawStatus === 'hidden'
      ? rawStatus
      : 'all'
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  const supabase = createSupabaseAdminClient()

  // Count per status tab (4 fast head queries) — scoped to managed venues for admin role
  let totalQ     = supabase.from('reviews').select('*', { count: 'exact', head: true })
  let pendingQ   = supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  let approvedQ  = supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved')
  let hiddenQ    = supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'hidden')

  if (admin.role === 'admin') {
    totalQ    = totalQ.in('venue_id', admin.managed_venue_ids)
    pendingQ  = pendingQ.in('venue_id', admin.managed_venue_ids)
    approvedQ = approvedQ.in('venue_id', admin.managed_venue_ids)
    hiddenQ   = hiddenQ.in('venue_id', admin.managed_venue_ids)
  }

  const [totalRes, pendingRes, approvedRes, hiddenRes] = await Promise.all([
    totalQ, pendingQ, approvedQ, hiddenQ,
  ])

  const counts = {
    all:      totalRes.count   ?? 0,
    pending:  pendingRes.count  ?? 0,
    approved: approvedRes.count ?? 0,
    hidden:   hiddenRes.count   ?? 0,
  }

  // Paginated reviews for the current tab
  let reviewsQuery = supabase
    .from('reviews')
    .select('id, rating, comment, status, created_at, venue_id, user_id, reservation_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (admin.role === 'admin') {
    reviewsQuery = reviewsQuery.in('venue_id', admin.managed_venue_ids)
  }
  if (filter !== 'all') reviewsQuery = reviewsQuery.eq('status', filter)

  const { data: rawReviews, count: tabCount } = await reviewsQuery
  const reviews: ReviewRow[] = rawReviews ?? []
  const totalForTab = tabCount ?? 0

  // Fetch profiles and venues for this page only
  const userIds  = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))]
  const venueIds = [...new Set(reviews.map((r) => r.venue_id).filter((v) => v && UUID_RE.test(v)))]

  const [profilesRes, venuesRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, name, player_id').in('id', userIds)
      : Promise.resolve({ data: [] }),
    venueIds.length > 0
      ? supabase.from('venues').select('id, name').in('id', venueIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap: Record<string, { name: string; player_id: number }> =
    Object.fromEntries((profilesRes.data ?? []).map((p) => [p.id, p]))
  const venueMap: Record<string, { name: string }> =
    Object.fromEntries((venuesRes.data ?? []).map((v) => [v.id, v]))

  type EnrichedReview = ReviewRow & {
    profiles: { name: string; player_id: number } | null
    venues: { name: string } | null
  }
  const enrichedReviews: EnrichedReview[] = reviews.map((r) => ({
    ...r,
    profiles: profileMap[r.user_id] ?? null,
    venues:   venueMap[r.venue_id]  ?? null,
  }))

  function tabHref(key: StatusFilter, p = 1) {
    const params = new URLSearchParams()
    if (key !== 'all') params.set('status', key)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/dashboard/reviews${qs ? '?' + qs : ''}`
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'pending',  label: `Pending (${counts.pending})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'hidden',   label: `Hidden (${counts.hidden})` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Reviews</h1>
        {counts.pending > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <a
            key={key}
            href={tabHref(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {enrichedReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No reviews in this category.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">User</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Rating</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Comment</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Status</th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {enrichedReviews.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.profiles?.name ?? '—'}</p>
                      {r.profiles?.player_id && (
                        <p className="text-xs text-zinc-400">ID {r.profiles.player_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{r.venues?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-base tracking-tight" aria-hidden="true">
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                      <span className="sr-only">{r.rating} out of 5 stars</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-xs">
                      {r.comment ? (
                        <p className="line-clamp-2">{r.comment}</p>
                      ) : (
                        <span className="text-zinc-300 italic">No comment</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yerevan' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ReviewActionButtons
                        status={r.status}
                        onApprove={approveReview.bind(null, r.id, r.venue_id ?? '')}
                        onHide={hideReview.bind(null, r.id, r.venue_id ?? '')}
                        onDelete={deleteReview.bind(null, r.id, r.venue_id ?? '')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={totalForTab}
            prevHref={page > 1 ? tabHref(filter, page - 1) : null}
            nextHref={page * PAGINATION_SIZE < totalForTab ? tabHref(filter, page + 1) : null}
          />
        </>
      )}
    </div>
  )
}
