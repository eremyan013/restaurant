import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'
import ConciergeSearch from './concierge-search'

export const metadata: Metadata = { title: 'Concierge Inbox — Tonir Admin' }
import type { ConciergeSessionRow } from '@/lib/database.types'

type StatusFilter = 'all' | 'escalated' | 'active' | 'resolved'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-zinc-100 text-zinc-500',
  escalated: 'bg-red-50 text-red-600',
  resolved:  'bg-green-50 text-green-700',
}

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const { status: rawStatus, page: rawPage, q: rawQ } = await searchParams
  const filter: StatusFilter =
    rawStatus === 'escalated' || rawStatus === 'active' || rawStatus === 'resolved'
      ? rawStatus
      : 'all'
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)
  const q = rawQ?.trim() ?? ''
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  const supabase = createSupabaseAdminClient()

  // Counts per tab (fast head queries)
  const [totalRes, activeRes, escalatedRes, resolvedRes] = await Promise.all([
    supabase.from('concierge_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'escalated'),
    supabase.from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
  ])

  const counts = {
    all:       totalRes.count      ?? 0,
    active:    activeRes.count     ?? 0,
    escalated: escalatedRes.count  ?? 0,
    resolved:  resolvedRes.count   ?? 0,
  }

  // Two-step search: resolve matching user IDs from profiles first
  let filteredUserIds: string[] | null = null
  if (q) {
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('name', `%${q}%`)
    filteredUserIds = (matchingProfiles ?? []).map((p: { id: string }) => p.id)
  }

  // Paginated sessions for the current tab
  let sessionsQuery = supabase
    .from('concierge_sessions')
    .select('id, status, started_at, last_message_at, profiles(name, player_id)', { count: 'exact' })
    .order('last_message_at', { ascending: false })
    .range(from, to)

  if (filter !== 'all') sessionsQuery = sessionsQuery.eq('status', filter)
  if (filteredUserIds !== null) {
    sessionsQuery = sessionsQuery.in('user_id', filteredUserIds.length > 0 ? filteredUserIds : [''])
  }

  const { data: sessionsData, count: tabCount } = await sessionsQuery
  type SessionWithJoins = ConciergeSessionRow & {
    profiles: { name: string; player_id: number } | null
  }
  const sessions: SessionWithJoins[] = sessionsData ?? []
  const totalForTab = tabCount ?? 0

  const sessionIds = (sessionsData ?? []).map((s: { id: string }) => s.id)

  const [lastMsgsRes, msgCountsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from('concierge_messages')
          .select('session_id, text, created_at')
          .in('session_id', sessionIds)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(sessionIds.length * 3)
      : Promise.resolve({ data: [] as { session_id: string; text: string; created_at: string }[] }),
    sessionIds.length > 0
      ? supabase
          .from('concierge_messages')
          .select('session_id')
          .in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ])

  // Build lookup maps
  const lastUserMsgMap: Record<string, string> = {}
  for (const msg of (lastMsgsRes.data ?? [])) {
    if (!lastUserMsgMap[msg.session_id]) lastUserMsgMap[msg.session_id] = msg.text
  }
  const msgCountMap: Record<string, number> = {}
  for (const msg of (msgCountsRes.data ?? [])) {
    msgCountMap[msg.session_id] = (msgCountMap[msg.session_id] ?? 0) + 1
  }

  function tabHref(key: StatusFilter, p = 1) {
    const params = new URLSearchParams()
    if (key !== 'all') params.set('status', key)
    if (p > 1) params.set('page', String(p))
    if (q) params.set('q', q)
    const qs = params.toString()
    return `/dashboard/concierge${qs ? '?' + qs : ''}`
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: `All (${counts.all})` },
    { key: 'escalated', label: `Escalated (${counts.escalated})` },
    { key: 'active',    label: `Active (${counts.active})` },
    { key: 'resolved',  label: `Resolved (${counts.resolved})` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Concierge Inbox</h1>
        {counts.escalated > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
            {counts.escalated} need attention
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={tabHref(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <ConciergeSearch initialQ={q || undefined} />

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No conversations yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500">User</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Last message</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Messages</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Last activity</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const lastUserMsg = lastUserMsgMap[s.id]
                  const msgCount = msgCountMap[s.id] ?? 0
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-zinc-100 last:border-0 ${
                        s.status === 'escalated' ? 'bg-red-50/40' : 'odd:bg-white even:bg-zinc-50/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{s.profiles?.name ?? 'Anonymous'}</p>
                        {s.profiles?.player_id && (
                          <p className="text-xs text-zinc-400">ID {s.profiles.player_id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 max-w-xs">
                        {lastUserMsg ? (
                          <p className="truncate">{lastUserMsg}</p>
                        ) : (
                          <span className="text-zinc-300 italic">No messages</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">{msgCount}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(s.last_message_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] ?? ''}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/concierge/${s.id}`}
                          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
