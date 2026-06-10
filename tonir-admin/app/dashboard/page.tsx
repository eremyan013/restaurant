import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

const STATUS_CLASSES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  visited:   'bg-blue-100 text-blue-800',
}

const ACTION_LABELS: Record<string, string> = {
  confirm_reservation:     'Confirmed reservation',
  cancel_reservation:      'Cancelled reservation',
  mark_visited:            'Marked as visited',
  update_reservation_note: 'Updated note on',
  approve_review:          'Approved review for',
  hide_review:             'Hid review for',
  delete_review:           'Deleted review for',
  adjust_yel:              'Adjusted YEL for',
  bulk_adjust_yel:         'Bulk YEL adjustment',
  update_venue:            'Updated venue',
  delete_venue:            'Deleted venue',
  create_venue:            'Created venue',
  toggle_prize:            'Toggled prize',
  delete_prize:            'Deleted prize',
  create_prize:            'Created prize',
  mark_prize_used:         'Marked prize used',
  resolve_concierge:       'Resolved concierge',
  escalate_concierge:      'Escalated concierge',
}

const ACTION_COLORS: Record<string, string> = {
  confirm_reservation:  'bg-green-500',
  mark_visited:         'bg-blue-500',
  approve_review:       'bg-green-500',
  create_venue:         'bg-blue-500',
  create_prize:         'bg-blue-500',
  mark_prize_used:      'bg-green-500',
  resolve_concierge:    'bg-green-500',
  cancel_reservation:   'bg-red-500',
  hide_review:          'bg-red-400',
  delete_review:        'bg-red-500',
  delete_venue:         'bg-red-500',
  delete_prize:         'bg-red-500',
  escalate_concierge:   'bg-amber-500',
  adjust_yel:           'bg-amber-500',
  bulk_adjust_yel:      'bg-amber-500',
  update_venue:         'bg-[#F0AB0C]',
  toggle_prize:         'bg-zinc-400',
  update_reservation_note: 'bg-zinc-400',
}

type TodayReservation = {
  id: string
  time: string
  people: number
  status: string
  occasion: string | null
  venues:   { name: string } | null
  profiles: { name: string } | null
}

type ActivityEntry = {
  id: string
  admin_name: string
  action: string
  entity_name: string
  created_at: string
}

type PendingReview = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { name: string } | null
  venues:   { name: string } | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

async function getSuperAdminStats() {
  try {
    const supabase = createSupabaseAdminClient()
    const now   = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgoDate  = new Date(now); weekAgoDate.setDate(weekAgoDate.getDate() - 7)
    const weekAgoIso   = weekAgoDate.toISOString().split('T')[0]
    const monthStart   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const weekAgoTs   = weekAgoDate.toISOString()
    const monthStartTs = monthStart + 'T00:00:00'

    const [
      venues, todayRes, pendingRes, users, todayList, activityRes,
      pendingReviewsCount, pendingReviewsList,
      resWeek, resMonth, usersWeek, usersMonth,
      claimedWeek, claimedMonth, redeemedWeek, redeemedMonth,
      activePrizes, totalPrizes, monthVenueRows,
    ] = await Promise.all([
      supabase.from('venues').select('id, name, is_active'),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('date_iso', today),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      (supabase as any)
        .from('reservations')
        .select('id, time, people, status, occasion, venues(name), profiles(name)')
        .eq('date_iso', today)
        .order('time', { ascending: true })
        .limit(20),
      (supabase as any)
        .from('admin_activity_log')
        .select('id, admin_name, action, entity_name, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      (supabase as any)
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(name), venues(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('date_iso', weekAgoIso),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('date_iso', monthStart),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoTs),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStartTs),
      (supabase as any).from('user_prizes').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoTs),
      (supabase as any).from('user_prizes').select('*', { count: 'exact', head: true }).gte('created_at', monthStartTs),
      (supabase as any).from('user_prizes').select('*', { count: 'exact', head: true }).eq('status', 'used').gte('used_at', weekAgoTs),
      (supabase as any).from('user_prizes').select('*', { count: 'exact', head: true }).eq('status', 'used').gte('used_at', monthStartTs),
      supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('prizes').select('*', { count: 'exact', head: true }),
      (supabase as any).from('reservations').select('venue_id').gte('date_iso', monthStart).neq('status', 'cancelled').limit(2000),
    ])

    const venueNameMap: Record<string, string> = Object.fromEntries(
      (venues.data ?? []).map((v: { id: string; name: string }) => [v.id, v.name])
    )
    const venueCounts: Record<string, number> = {}
    for (const r of (monthVenueRows.data ?? [])) {
      venueCounts[r.venue_id] = (venueCounts[r.venue_id] ?? 0) + 1
    }
    const topVenues = Object.entries(venueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, name: venueNameMap[id] ?? '—', count }))
    const monthResTotal = Object.values(venueCounts).reduce((s, n) => s + n, 0)

    return {
      ok: true as const,
      activeVenues: venues.data?.filter((v: { is_active: boolean }) => v.is_active).length ?? 0,
      totalVenues: venues.data?.length ?? 0,
      todayReservations: todayRes.count ?? 0,
      pendingReservations: pendingRes.count ?? 0,
      totalUsers: users.count ?? 0,
      todayList: (todayList.data ?? []) as TodayReservation[],
      showVenueCol: true,
      activity: (activityRes.data ?? []) as ActivityEntry[],
      pendingReviewsCount: pendingReviewsCount.count ?? 0,
      pendingReviewsList: (pendingReviewsList.data ?? []) as PendingReview[],
      resWeek:       resWeek.count       ?? 0,
      resMonth:      resMonth.count      ?? 0,
      usersWeek:     usersWeek.count     ?? 0,
      usersMonth:    usersMonth.count    ?? 0,
      claimedWeek:   claimedWeek.count   ?? 0,
      claimedMonth:  claimedMonth.count  ?? 0,
      redeemedWeek:  redeemedWeek.count  ?? 0,
      redeemedMonth: redeemedMonth.count ?? 0,
      activePrizes:  activePrizes.count  ?? 0,
      totalPrizes:   totalPrizes.count   ?? 0,
      topVenues,
      monthResTotal,
    }
  } catch {
    return { ok: false as const }
  }
}

async function getAdminStats(adminId: string, venueIds: string[]) {
  try {
    const supabase = createSupabaseAdminClient()
    const now   = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgoDate = new Date(now); weekAgoDate.setDate(weekAgoDate.getDate() - 7)
    const weekAgoIso  = weekAgoDate.toISOString().split('T')[0]
    const monthStart  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [venues, todayRes, pendingRes, totalRes, todayList, activityRes, resWeek, resMonth, visitsWeek, visitsMonth] = await Promise.all([
      (supabase as any).from('venues').select('name').in('id', venueIds),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('date_iso', today),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'pending'),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds),
      (supabase as any)
        .from('reservations')
        .select('id, time, people, status, occasion, venues(name), profiles(name)')
        .in('venue_id', venueIds)
        .eq('date_iso', today)
        .order('time', { ascending: true })
        .limit(20),
      (supabase as any)
        .from('admin_activity_log')
        .select('id, admin_name, action, entity_name, created_at')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(15),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).gte('date_iso', weekAgoIso),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).gte('date_iso', monthStart),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'visited').gte('date_iso', weekAgoIso),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'visited').gte('date_iso', monthStart),
    ])

    const venueNames: string[] = (venues.data ?? []).map((v: { name: string }) => v.name)
    const venueLabel = venueNames.length === 1 ? venueNames[0] : `${venueNames.length} venues`

    return {
      ok: true as const,
      venueLabel,
      todayReservations: todayRes.count ?? 0,
      pendingReservations: pendingRes.count ?? 0,
      totalReservations: totalRes.count ?? 0,
      todayList: (todayList.data ?? []) as TodayReservation[],
      showVenueCol: venueIds.length > 1,
      activity: (activityRes.data ?? []) as ActivityEntry[],
      resWeek:     resWeek.count    ?? 0,
      resMonth:    resMonth.count   ?? 0,
      visitsWeek:  visitsWeek.count ?? 0,
      visitsMonth: visitsMonth.count ?? 0,
    }
  } catch {
    return { ok: false as const }
  }
}

function TopVenues({ venues, total }: { venues: { id: string; name: string; count: number }[]; total: number }) {
  if (venues.length === 0) {
    return <p className="text-sm text-zinc-400 py-6 text-center">No reservations this month.</p>
  }

  const max = venues[0].count

  return (
    <ul className="divide-y divide-zinc-100">
      {venues.map((v, i) => {
        const pct = max > 0 ? Math.round((v.count / max) * 100) : 0
        const share = total > 0 ? Math.round((v.count / total) * 100) : 0
        return (
          <li key={v.id} className="flex items-center gap-4 px-5 py-3">
            <span className="text-xs font-semibold text-zinc-400 w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-zinc-900 truncate">{v.name}</p>
                <span className="text-sm tabular-nums font-semibold text-zinc-700 ml-2 shrink-0">{v.count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
                  <div className="bg-zinc-800 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-zinc-400 shrink-0 w-8 text-right">{share}%</span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function TrendStrip({ stats }: { stats: { label: string; week: number; month: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 divide-x divide-zinc-100 flex overflow-hidden">
      {stats.map(s => (
        <div key={s.label} className="flex-1 px-5 py-4 min-w-0">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide truncate">{s.label}</p>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <span className="text-xl font-semibold text-zinc-900 tabular-nums">{s.week}</span>
            <span className="text-xs text-zinc-400">7 days</span>
            <span className="text-xl font-semibold text-zinc-700 tabular-nums">{s.month}</span>
            <span className="text-xs text-zinc-400">this month</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TodayReservationsList({
  reservations,
  showVenueCol,
}: {
  reservations: TodayReservation[]
  showVenueCol: boolean
}) {
  if (reservations.length === 0) {
    return (
      <p className="text-sm text-zinc-400 py-6 text-center">No reservations today.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
            <th className="px-4 py-3 font-medium text-zinc-500">Time</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Guest</th>
            {showVenueCol && <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>}
            <th className="px-4 py-3 font-medium text-zinc-500">People</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Occasion</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(r => (
            <tr key={r.id} className="border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
              <td className="px-4 py-3 tabular-nums font-medium text-zinc-900 whitespace-nowrap">{r.time ?? '—'}</td>
              <td className="px-4 py-3 text-zinc-700">{r.profiles?.name ?? '—'}</td>
              {showVenueCol && <td className="px-4 py-3 text-zinc-600">{r.venues?.name ?? '—'}</td>}
              <td className="px-4 py-3 tabular-nums text-zinc-600">{r.people ?? '—'}</td>
              <td className="px-4 py-3 text-zinc-500 text-xs">{r.occasion ?? <span className="text-zinc-300">—</span>}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[r.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PendingReviewsList({ reviews }: { reviews: PendingReview[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-zinc-400 py-6 text-center">No pending reviews.</p>
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {reviews.map(r => (
        <li key={r.id} className="px-5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm text-amber-500 tracking-tighter leading-none">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <span className="text-xs text-zinc-400">{r.venues?.name ?? '—'}</span>
              </div>
              <p className="text-sm font-medium text-zinc-900">{r.profiles?.name ?? '—'}</p>
              {r.comment && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{r.comment}</p>
              )}
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0 mt-0.5">
              {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-400 py-6 text-center px-5">No recent activity.</p>
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {entries.map(e => {
        const dot = ACTION_COLORS[e.action] ?? 'bg-zinc-300'
        const label = ACTION_LABELS[e.action] ?? e.action.replace(/_/g, ' ')
        return (
          <li key={e.id} className="flex items-start gap-3 px-5 py-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-700 leading-snug">
                <span className="font-medium text-zinc-900">{e.admin_name}</span>
                {' '}{label}
                {e.entity_name ? (
                  <span className="text-zinc-500"> · {e.entity_name}</span>
                ) : null}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5" title={new Date(e.created_at).toLocaleString()}>
                {timeAgo(e.created_at)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default async function DashboardPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  // ── Restaurant Admin ──────────────────────────────────────────────────────────
  if (admin.role === 'admin') {
    if (!admin.managed_venue_ids.length) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
          <p className="text-sm text-zinc-500">No venue assigned to your account yet. Contact the super admin.</p>
        </div>
      )
    }

    const stats = await getAdminStats(admin.id, admin.managed_venue_ids)

    if (!stats.ok) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-600">
            Could not load stats — try refreshing the page.
          </div>
        </div>
      )
    }

    const cards = [
      { label: stats.venueLabel.includes('venues') ? 'Venues' : 'Venue', value: stats.venueLabel, sub: 'your restaurant', href: '/dashboard/venues' },
      { label: "Today's Reservations", value: stats.todayReservations, sub: 'bookings today', href: '/dashboard/reservations' },
      { label: 'Pending Review', value: stats.pendingReservations, sub: 'need confirmation', highlight: stats.pendingReservations > 0, href: '/dashboard/reservations?status=pending' },
      { label: 'Total Reservations', value: stats.totalReservations, sub: 'all time', href: '/dashboard/reservations' },
    ]

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => (
              <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all block">
                <p className="text-sm text-zinc-500">{card.label}</p>
                <p className={`text-3xl font-semibold mt-1 tabular-nums ${'highlight' in card && card.highlight ? 'text-amber-600' : 'text-zinc-900'}`}>
                  {card.value}
                </p>
                <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
              </Link>
            ))}
          </div>
        </div>

        <TrendStrip stats={[
          { label: 'Reservations', week: stats.resWeek,    month: stats.resMonth },
          { label: 'Visits',       week: stats.visitsWeek, month: stats.visitsMonth },
        ]} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Today's Reservations</h2>
              <Link href="/dashboard/reservations" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                View all →
              </Link>
            </div>
            <TodayReservationsList reservations={stats.todayList} showVenueCol={stats.showVenueCol} />
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">My Recent Activity</h2>
            </div>
            <ActivityFeed entries={stats.activity} />
          </div>
        </div>
      </div>
    )
  }

  // ── Super Admin ───────────────────────────────────────────────────────────────
  const stats = await getSuperAdminStats()

  if (!stats.ok) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-600">
          Could not load stats — database may be temporarily unavailable. Try refreshing the page.
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Active Venues',          value: `${stats.activeVenues} / ${stats.totalVenues}`, sub: 'venues in app',        highlight: false, href: '/dashboard/venues' },
    { label: "Today's Reservations",   value: stats.todayReservations,                        sub: 'bookings today',       highlight: false, href: '/dashboard/reservations' },
    { label: 'Pending Reservations',   value: stats.pendingReservations,                      sub: 'need confirmation',    highlight: stats.pendingReservations > 0, href: '/dashboard/reservations?status=pending' },
    { label: 'Pending Reviews',        value: stats.pendingReviewsCount,                      sub: 'awaiting moderation',  highlight: stats.pendingReviewsCount > 0, href: '/dashboard/reviews?status=pending' },
    { label: 'Registered Users',       value: stats.totalUsers,                               sub: 'total accounts',       highlight: false, href: '/dashboard/users' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cards.map(card => (
            <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all block">
              <p className="text-sm text-zinc-500">{card.label}</p>
              <p className={`text-3xl font-semibold mt-1 tabular-nums ${card.highlight ? 'text-amber-600' : 'text-zinc-900'}`}>
                {card.value}
              </p>
              <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      <TrendStrip stats={[
        { label: 'Reservations',    week: stats.resWeek,      month: stats.resMonth },
        { label: 'New users',       week: stats.usersWeek,    month: stats.usersMonth },
        { label: 'Prizes claimed',  week: stats.claimedWeek,  month: stats.claimedMonth },
        { label: 'Prizes redeemed', week: stats.redeemedWeek, month: stats.redeemedMonth },
      ]} />

      {(stats.activePrizes > 0 || stats.totalPrizes > 0) && (
        <div className="flex items-center gap-2 -mt-4 px-1">
          <span className="text-xs text-zinc-400">
            <span className="font-medium text-zinc-600">{stats.activePrizes}</span> active prize{stats.activePrizes !== 1 ? 's' : ''} of {stats.totalPrizes} total
          </span>
          <Link href="/dashboard/prizes" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            Manage →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Today's Reservations</h2>
            <Link href="/dashboard/reservations" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              View all →
            </Link>
          </div>
          <TodayReservationsList reservations={stats.todayList} showVenueCol={stats.showVenueCol} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Top Venues This Month</h2>
              <Link href="/dashboard/venues" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                All venues →
              </Link>
            </div>
            <TopVenues venues={stats.topVenues} total={stats.monthResTotal} />
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Recent Activity</h2>
            </div>
            <ActivityFeed entries={stats.activity} />
          </div>
        </div>
      </div>

      {stats.pendingReviewsCount > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-amber-900">Pending Reviews</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {stats.pendingReviewsCount}
              </span>
            </div>
            <Link href="/dashboard/reviews?status=pending" className="text-xs text-amber-700 hover:text-amber-900 transition-colors font-medium">
              Review all →
            </Link>
          </div>
          <PendingReviewsList reviews={stats.pendingReviewsList} />
        </div>
      )}
    </div>
  )
}
