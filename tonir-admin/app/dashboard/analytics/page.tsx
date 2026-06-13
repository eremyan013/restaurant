import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { AnalyticsCharts } from './analytics-charts'

// Estimated avg check per person in AMD, by venue price tier
const PRICE_CHECK: Record<string, number> = {
  '֏':    5_000,
  '֏֏':   8_000,
  '֏֏֏':  12_000,
  '֏֏֏֏': 18_000,
}

type RawReservation = {
  date_iso: string | null
  time: string
  people: number
  status: string
  venue_id: string
  venues: { name: string; price: string } | null
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const sp = await searchParams
  const range = sp.range === '7' ? 7 : sp.range === '90' ? 90 : 30

  const supabase = createSupabaseAdminClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - range + 1)
  const startISO = startDate.toISOString().split('T')[0]

  // Cap at 5 000 rows — sufficient for a 90-day window at current venue volume.
  // Reservations in the selected range
  const { data: rawRes } = await supabase
    .from('reservations')
    .select('date_iso, time, people, status, venue_id, venues(name, price)')
    .gte('date_iso', startISO)
    .order('date_iso', { ascending: true })
    .limit(5000)

  const reservations: RawReservation[] = rawRes ?? []

  // All-time KPI totals
  const [allResResult, allUsersResult] = await Promise.all([
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('role', 'in', '("admin","super_admin")'),
  ])

  // User sign-ups (last 90 days)
  const growthStart = new Date()
  growthStart.setDate(growthStart.getDate() - 89)
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('created_at')
    .not('role', 'in', '("admin","super_admin")')
    .gte('created_at', growthStart.toISOString())
    .order('created_at', { ascending: true })

  // ── Reservations by day ─────────────────────────────────────────────────────
  const byDay: Record<string, number> = {}
  for (let d = 0; d < range; d++) {
    const dt = new Date()
    dt.setDate(dt.getDate() - (range - 1 - d))
    byDay[dt.toISOString().split('T')[0]] = 0
  }
  for (const r of reservations) {
    if (r.date_iso && byDay[r.date_iso] !== undefined) byDay[r.date_iso]++
  }
  const trendData = Object.entries(byDay).map(([date, bookings]) => ({
    date: date.slice(5).replace('-', '/'),
    bookings,
  }))

  // ── Peak booking times ──────────────────────────────────────────────────────
  const byTime: Record<string, number> = {}
  for (const r of reservations) {
    if (r.status === 'cancelled') continue
    byTime[r.time] = (byTime[r.time] ?? 0) + 1
  }
  const peakData = Object.entries(byTime)
    .map(([time, bookings]) => ({ time, bookings }))
    .sort((a, b) => a.time.localeCompare(b.time))

  // ── Venue popularity ────────────────────────────────────────────────────────
  const byVenue: Record<string, { name: string; bookings: number; people: number; revenue: number }> = {}
  for (const r of reservations) {
    if (!r.venues) continue
    if (!byVenue[r.venue_id]) byVenue[r.venue_id] = { name: r.venues.name, bookings: 0, people: 0, revenue: 0 }
    byVenue[r.venue_id].bookings++
    if (r.status !== 'cancelled') {
      byVenue[r.venue_id].people += r.people
      if (r.status === 'confirmed' || r.status === 'visited') {
        byVenue[r.venue_id].revenue += r.people * (PRICE_CHECK[r.venues.price] ?? 8_000)
      }
    }
  }
  const venueData = Object.values(byVenue)
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10)

  // ── Status breakdown ────────────────────────────────────────────────────────
  const statusCount: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, visited: 0 }
  for (const r of reservations) statusCount[r.status] = (statusCount[r.status] ?? 0) + 1

  // ── KPI summary ─────────────────────────────────────────────────────────────
  const totalBookings  = reservations.length
  const totalCovers    = reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.people, 0)
  const converted      = reservations.filter(r => r.status === 'confirmed' || r.status === 'visited').length
  const nonCancelled   = reservations.filter(r => r.status !== 'cancelled').length
  const conversionRate = nonCancelled > 0 ? Math.round((converted / nonCancelled) * 100) : 0
  const estRevenue     = venueData.reduce((s, v) => s + v.revenue, 0)

  // ── User sign-ups by day ────────────────────────────────────────────────────
  const signupsByDay: Record<string, number> = {}
  for (let d = 0; d < 90; d++) {
    const dt = new Date()
    dt.setDate(dt.getDate() - (89 - d))
    signupsByDay[dt.toISOString().split('T')[0]] = 0
  }
  for (const p of (rawProfiles ?? [])) {
    const day = (p.created_at as string).split('T')[0]
    if (signupsByDay[day] !== undefined) signupsByDay[day]++
  }
  const userGrowthData = Object.entries(signupsByDay).map(([date, signups]) => ({
    date: date.slice(5).replace('-', '/'),
    signups,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Reservation trends, peak hours, and venue performance.
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
          {([7, 30, 90] as const).map((r) => (
            <a
              key={r}
              href={`/dashboard/analytics?range=${r}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {r}d
            </a>
          ))}
        </div>
      </div>

      <AnalyticsCharts
        range={range}
        totalBookings={totalBookings}
        totalCovers={totalCovers}
        conversionRate={conversionRate}
        estRevenue={estRevenue}
        allTimeBookings={allResResult.count ?? 0}
        allTimeUsers={allUsersResult.count ?? 0}
        trendData={trendData}
        peakData={peakData}
        venueData={venueData}
        statusCount={statusCount}
        userGrowthData={userGrowthData}
      />
    </div>
  )
}
