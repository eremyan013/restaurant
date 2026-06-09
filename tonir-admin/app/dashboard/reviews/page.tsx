import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { logActivity } from '@/lib/log-activity'

type StatusFilter = 'all' | 'pending' | 'approved' | 'hidden'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  hidden:   'bg-zinc-100 text-zinc-500',
}

async function recalcVenueRating(supabase: any, venueId: string) {
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

async function approveReview(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const id       = formData.get('id') as string
  const venueId  = formData.get('venue_id') as string
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('reviews').update({ status: 'approved' }).eq('id', id)
  await recalcVenueRating(supabase as any, venueId)
  await logActivity(actor, 'approve_review', 'review', id, venueId)
  revalidatePath('/dashboard/reviews')
}

async function hideReview(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const id       = formData.get('id') as string
  const venueId  = formData.get('venue_id') as string
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('reviews').update({ status: 'hidden' }).eq('id', id)
  await recalcVenueRating(supabase as any, venueId)
  await logActivity(actor, 'hide_review', 'review', id, venueId)
  revalidatePath('/dashboard/reviews')
}

async function deleteReview(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const id       = formData.get('id') as string
  const venueId  = formData.get('venue_id') as string
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('reviews').delete().eq('id', id)
  await recalcVenueRating(supabase as any, venueId)
  await logActivity(actor, 'delete_review', 'review', id, venueId)
  revalidatePath('/dashboard/reviews')
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const { status: rawStatus } = await searchParams
  const filter: StatusFilter =
    rawStatus === 'pending' || rawStatus === 'approved' || rawStatus === 'hidden'
      ? rawStatus
      : 'all'

  const supabase = createSupabaseAdminClient()

  const [reviewsRes, countsRes] = await Promise.all([
    (supabase as any)
      .from('reviews')
      .select('id, rating, comment, status, created_at, venue_id, user_id, profiles(name, player_id), venues(name)')
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('reviews')
      .select('status'),
  ])

  const allReviews: any[] = reviewsRes.data ?? []
  const allCounts: any[]  = countsRes.data ?? []

  const counts = {
    all:      allCounts.length,
    pending:  allCounts.filter((r: any) => r.status === 'pending').length,
    approved: allCounts.filter((r: any) => r.status === 'approved').length,
    hidden:   allCounts.filter((r: any) => r.status === 'hidden').length,
  }

  const reviews = filter === 'all' ? allReviews : allReviews.filter(r => r.status === filter)

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
            href={key === 'all' ? '/dashboard/reviews' : `/dashboard/reviews?status=${key}`}
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

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No reviews in this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">User</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Rating</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Comment</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {reviews.map((r: any) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{r.profiles?.name ?? '—'}</p>
                    {r.profiles?.player_id && (
                      <p className="text-xs text-zinc-400">ID {r.profiles.player_id}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{r.venues?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-base tracking-tight">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 max-w-xs">
                    {r.comment ? (
                      <p className="line-clamp-2">{r.comment}</p>
                    ) : (
                      <span className="text-zinc-300 italic">No comment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {r.status !== 'approved' && (
                        <form action={approveReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="venue_id" value={r.venue_id} />
                          <button type="submit" className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors">
                            Approve
                          </button>
                        </form>
                      )}
                      {r.status !== 'hidden' && (
                        <form action={hideReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="venue_id" value={r.venue_id} />
                          <button type="submit" className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors">
                            Hide
                          </button>
                        </form>
                      )}
                      <form action={deleteReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="venue_id" value={r.venue_id} />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                          onClick={e => { if (!confirm('Delete this review permanently?')) e.preventDefault() }}
                        >
                          Delete
                        </button>
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
  )
}
