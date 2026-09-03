import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const metadata: Metadata = { title: 'Agent Performance — Tonir Admin' }

type Props = { searchParams: Promise<{ days?: string }> }

export default async function AgentsPage({ searchParams }: Props) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const sp = await searchParams
  const days = sp.days === '7' ? 7 : sp.days === '90' ? 90 : 30

  const supabase = createSupabaseAdminClient()

  const startISO = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Step 1 — fetch relevant log entries
  const { data: logs } = await supabase
    .from('admin_activity_log')
    .select('admin_id, admin_name, action, entity_id, created_at')
    .in('action', ['confirm_reservation', 'cancel_reservation', 'offer_alternatives'])
    .gte('created_at', startISO)
    .order('created_at', { ascending: true })
    .limit(10000)

  // Step 2 — fetch reservation created_at for each entity_id
  const reservationIds = [...new Set((logs ?? []).map(l => l.entity_id).filter(Boolean))] as string[]
  let resMap = new Map<string, { created_at: string }>()
  if (reservationIds.length > 0) {
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, created_at')
      .in('id', reservationIds)
    resMap = new Map((reservations ?? []).map(r => [r.id, r]))
  }

  // Step 3 — aggregate per agent in JS
  type AgentStats = {
    admin_id: string
    admin_name: string
    total: number
    confirmed: number
    slaCompliant: number
    responseTimes: number[]
  }

  const agentMap = new Map<string, AgentStats>()
  const seen = new Set<string>() // `${admin_id}:${entity_id}` — deduplicate per reservation

  for (const log of (logs ?? [])) {
    if (!log.admin_id || !log.entity_id) continue
    const key = `${log.admin_id}:${log.entity_id}`
    if (!agentMap.has(log.admin_id)) {
      agentMap.set(log.admin_id, {
        admin_id: log.admin_id,
        admin_name: log.admin_name ?? log.admin_id,
        total: 0,
        confirmed: 0,
        slaCompliant: 0,
        responseTimes: [],
      })
    }
    const stats = agentMap.get(log.admin_id)!
    if (!seen.has(key)) {
      seen.add(key)
      stats.total++
    }
    if (log.action === 'confirm_reservation') {
      stats.confirmed++
      const res = resMap.get(log.entity_id)
      if (res) {
        const deltaMin =
          (new Date(log.created_at!).getTime() - new Date(res.created_at).getTime()) / 60000
        stats.responseTimes.push(deltaMin)
        if (deltaMin <= 30) stats.slaCompliant++
      }
    }
  }

  const agentRows = [...agentMap.values()].sort((a, b) => b.total - a.total)

  // Step 4 — fleet-wide summary
  const fleetTotal     = agentRows.reduce((s, a) => s + a.total, 0)
  const fleetConfirmed = agentRows.reduce((s, a) => s + a.confirmed, 0)
  const fleetSla       = agentRows.reduce((s, a) => s + a.slaCompliant, 0)
  const allTimes       = agentRows.flatMap(a => a.responseTimes)
  const fleetAvgTime   = allTimes.length
    ? (allTimes.reduce((s, v) => s + v, 0) / allTimes.length).toFixed(1)
    : '—'
  const fleetConfRate  = fleetTotal > 0
    ? ((fleetConfirmed / fleetTotal) * 100).toFixed(1)
    : '—'
  const fleetSlaRate   = fleetConfirmed > 0
    ? ((fleetSla / fleetConfirmed) * 100).toFixed(1)
    : '—'

  const summaryCards = [
    { label: 'Total Handled',      value: String(fleetTotal) },
    { label: 'Confirmation Rate',  value: fleetConfRate === '—' ? '—' : fleetConfRate + '%' },
    { label: 'SLA Compliance',     value: fleetSlaRate === '—' ? '—' : fleetSlaRate + '%' },
    { label: 'Avg Response Time',  value: fleetAvgTime === '—' ? '—' : fleetAvgTime + ' min' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Agent Performance</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Reservation handling, confirmation rates, and SLA compliance per agent.
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
          {([7, 30, 90] as const).map(d => (
            <Link
              key={d}
              href={`/dashboard/agents?days=${d}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <p className="text-sm text-zinc-500 mb-1">{label}</p>
            <p className="text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Agent table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Per-Agent Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Agent
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Handled
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Confirmed
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Conf. Rate
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  SLA %
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Avg Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {agentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 text-sm">
                    No agent activity in this period.
                  </td>
                </tr>
              ) : (
                agentRows.map(row => {
                  const confRate = row.total > 0
                    ? ((row.confirmed / row.total) * 100).toFixed(1) + '%'
                    : '—'
                  const slaRate = row.confirmed > 0
                    ? ((row.slaCompliant / row.confirmed) * 100).toFixed(1) + '%'
                    : '—'
                  const avgTime = row.responseTimes.length
                    ? (row.responseTimes.reduce((s, v) => s + v, 0) / row.responseTimes.length).toFixed(1) + ' min'
                    : '—'

                  return (
                    <tr key={row.admin_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {row.admin_name}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-700">{row.total}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{row.confirmed}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{confRate}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{slaRate}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{avgTime}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
