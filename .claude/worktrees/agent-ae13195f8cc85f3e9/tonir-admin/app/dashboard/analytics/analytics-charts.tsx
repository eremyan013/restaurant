'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  range: number
  totalBookings: number
  totalCovers: number
  conversionRate: number
  estRevenue: number
  allTimeBookings: number
  allTimeUsers: number
  trendData: { date: string; bookings: number }[]
  peakData: { time: string; bookings: number }[]
  venueData: { name: string; bookings: number; people: number; revenue: number }[]
  statusCount: Record<string, number>
  userGrowthData: { date: string; signups: number }[]
}

const STATUS_COLOR: Record<string, string> = {
  pending:   '#f59e0b',
  confirmed: '#22c55e',
  cancelled: '#ef4444',
  visited:   '#3b82f6',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  visited:   'Visited',
}

function fmtAMD(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ֏`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K ֏`
  return `${v} ֏`
}

function kpiTrend(data: { bookings?: number; signups?: number }[], key: 'bookings' | 'signups') {
  const half = Math.floor(data.length / 2)
  const first = data.slice(0, half).reduce((s, d) => s + (d[key] ?? 0), 0)
  const second = data.slice(half).reduce((s, d) => s + (d[key] ?? 0), 0)
  if (first === 0) return null
  const pct = Math.round(((second - first) / first) * 100)
  return pct
}

export function AnalyticsCharts({
  range,
  totalBookings,
  totalCovers,
  conversionRate,
  estRevenue,
  allTimeBookings,
  allTimeUsers,
  trendData,
  peakData,
  venueData,
  statusCount,
  userGrowthData,
}: Props) {
  const maxVenueBookings = Math.max(...venueData.map(v => v.bookings), 1)
  const totalStatus = Object.values(statusCount).reduce((a, b) => a + b, 0)
  const trendChange = kpiTrend(trendData, 'bookings')

  const kpis = [
    {
      label: `Bookings (${range}d)`,
      value: totalBookings.toLocaleString(),
      sub: `${allTimeBookings.toLocaleString()} all time`,
      trend: trendChange,
    },
    {
      label: `Covers (${range}d)`,
      value: totalCovers.toLocaleString(),
      sub: 'non-cancelled guests',
      trend: null,
    },
    {
      label: 'Conversion rate',
      value: `${conversionRate}%`,
      sub: 'confirmed + visited / total',
      trend: null,
    },
    {
      label: 'Est. Revenue',
      value: fmtAMD(estRevenue),
      sub: 'based on venue price tier',
      trend: null,
    },
    {
      label: 'Registered Users',
      value: allTimeUsers.toLocaleString(),
      sub: 'all time',
      trend: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <p className="text-sm text-zinc-500">{k.label}</p>
            <p className="text-2xl font-semibold mt-1 text-zinc-900 tabular-nums">{k.value}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-xs text-zinc-400">{k.sub}</p>
              {k.trend !== null && (
                <span className={`text-xs font-medium ${k.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {k.trend >= 0 ? '↑' : '↓'}{Math.abs(k.trend)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Trend + Status ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Reservations trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-4">Reservations Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                interval={range === 7 ? 0 : range === 30 ? 4 : 13}
              />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                labelStyle={{ color: '#52525b' }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#18181b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#18181b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-4">Status Breakdown</p>
          <div className="space-y-3">
            {(['confirmed', 'visited', 'pending', 'cancelled'] as const).map(s => {
              const count = statusCount[s] ?? 0
              const pct = totalStatus > 0 ? (count / totalStatus) * 100 : 0
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-600 font-medium">{STATUS_LABEL[s]}</span>
                    <span className="text-zinc-400 tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[s] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-400 text-center">
            {totalStatus} total reservations
          </div>
        </div>
      </div>

      {/* ── Row 3: Peak hours ── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <p className="text-sm font-medium text-zinc-700 mb-4">Peak Booking Times</p>
        {peakData.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                cursor={{ fill: '#f4f4f5' }}
              />
              <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                {peakData.map((entry, i) => {
                  const max = Math.max(...peakData.map(d => d.bookings))
                  return (
                    <Cell
                      key={i}
                      fill={entry.bookings === max ? '#18181b' : '#d4d4d8'}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 4: Venue table + User growth ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top venues */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-4">Top Venues</p>
          {venueData.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No data for this period.</p>
          ) : (
            <div className="space-y-3">
              {venueData.map((v, i) => (
                <div key={v.name}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-4 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-zinc-800 font-medium truncate">{v.name}</p>
                        <div className="flex gap-4 shrink-0 ml-2">
                          <span className="text-xs text-zinc-400 tabular-nums">{v.bookings} bookings</span>
                          <span className="text-xs text-zinc-400 tabular-nums">{v.people} covers</span>
                          <span className="text-xs font-medium text-zinc-600 tabular-nums w-20 text-right">
                            {fmtAMD(v.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-800 rounded-full"
                          style={{ width: `${(v.bookings / maxVenueBookings) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-400 mt-4">
            Revenue is estimated from venue price tier × covers. Actual figures require POS integration.
          </p>
        </div>

        {/* User sign-ups */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-1">New Users</p>
          <p className="text-xs text-zinc-400 mb-4">Last 90 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={userGrowthData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                interval={29}
              />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                labelStyle={{ color: '#52525b' }}
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#18181b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#18181b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
