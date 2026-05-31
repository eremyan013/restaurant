import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

async function getSuperAdminStats() {
  try {
    const supabase = createSupabaseAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const [venues, todayRes, pendingRes, users] = await Promise.all([
      supabase.from('venues').select('id, is_active'),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    return {
      ok: true as const,
      activeVenues: venues.data?.filter(v => v.is_active).length ?? 0,
      totalVenues: venues.data?.length ?? 0,
      todayReservations: todayRes.count ?? 0,
      pendingReservations: pendingRes.count ?? 0,
      totalUsers: users.count ?? 0,
    }
  } catch {
    return { ok: false as const }
  }
}

async function getAdminStats(venueId: string) {
  try {
    const supabase = createSupabaseAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const [venue, todayRes, pendingRes, totalRes] = await Promise.all([
      (supabase as any).from('venues').select('name').eq('id', venueId).single(),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).eq('venue_id', venueId).eq('date', today),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).eq('venue_id', venueId).eq('status', 'pending'),
      (supabase as any).from('reservations').select('*', { count: 'exact', head: true }).eq('venue_id', venueId),
    ])

    return {
      ok: true as const,
      venueName: venue.data?.name ?? '—',
      todayReservations: todayRes.count ?? 0,
      pendingReservations: pendingRes.count ?? 0,
      totalReservations: totalRes.count ?? 0,
    }
  } catch {
    return { ok: false as const }
  }
}

export default async function DashboardPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  // ── Restaurant Admin ──────────────────────────────────────────────────────────
  if (admin.role === 'admin') {
    if (!admin.managed_venue_id) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
          <p className="text-sm text-zinc-500">No venue assigned to your account yet. Contact the super admin.</p>
        </div>
      )
    }

    const stats = await getAdminStats(admin.managed_venue_id)

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
      { label: 'Venue', value: stats.venueName, sub: 'your restaurant' },
      { label: "Today's Reservations", value: stats.todayReservations, sub: 'bookings today' },
      { label: 'Pending Review', value: stats.pendingReservations, sub: 'need confirmation', highlight: stats.pendingReservations > 0 },
      { label: 'Total Reservations', value: stats.totalReservations, sub: 'all time' },
    ]

    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-zinc-200 p-5">
              <p className="text-sm text-zinc-500">{card.label}</p>
              <p className={`text-3xl font-semibold mt-1 tabular-nums ${card.highlight ? 'text-amber-600' : 'text-zinc-900'}`}>
                {card.value}
              </p>
              <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
            </div>
          ))}
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
    { label: 'Active Venues', value: `${stats.activeVenues} / ${stats.totalVenues}`, sub: 'venues in app' },
    { label: "Today's Reservations", value: stats.todayReservations, sub: 'bookings today' },
    { label: 'Pending Review', value: stats.pendingReservations, sub: 'need confirmation', highlight: stats.pendingReservations > 0 },
    { label: 'Registered Users', value: stats.totalUsers, sub: 'total accounts' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className={`text-3xl font-semibold mt-1 tabular-nums ${'highlight' in card && card.highlight ? 'text-amber-600' : 'text-zinc-900'}`}>
              {card.value}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
