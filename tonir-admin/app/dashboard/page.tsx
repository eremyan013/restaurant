import { createSupabaseAdminClient } from '@/lib/supabase-admin'

async function getStats() {
  try {
    const supabase = createSupabaseAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const [venues, todayRes, pendingRes, users] = await Promise.all([
      supabase.from('venues').select('id, is_active'),
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('date', today),
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    const activeVenues = venues.data?.filter(v => v.is_active).length ?? 0
    const totalVenues = venues.data?.length ?? 0

    return {
      ok: true as const,
      activeVenues,
      totalVenues,
      todayReservations: todayRes.count ?? 0,
      pendingReservations: pendingRes.count ?? 0,
      totalUsers: users.count ?? 0,
    }
  } catch {
    return { ok: false as const }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    {
      label: 'Active Venues',
      value: `${stats.activeVenues} / ${stats.totalVenues}`,
      sub: 'venues in app',
    },
    {
      label: "Today's Reservations",
      value: stats.todayReservations,
      sub: 'bookings today',
    },
    {
      label: 'Pending Review',
      value: stats.pendingReservations,
      sub: 'need confirmation',
      highlight: stats.pendingReservations > 0,
    },
    {
      label: 'Registered Users',
      value: stats.totalUsers,
      sub: 'total accounts',
    },
  ]

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-zinc-200 p-5"
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p
              className={`text-3xl font-semibold mt-1 tabular-nums ${
                card.highlight ? 'text-amber-600' : 'text-zinc-900'
              }`}
            >
              {card.value}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
