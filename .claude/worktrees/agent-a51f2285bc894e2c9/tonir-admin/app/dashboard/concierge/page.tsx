import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'

type StatusFilter = 'all' | 'escalated' | 'active' | 'resolved'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-zinc-100 text-zinc-500',
  escalated: 'bg-red-50 text-red-600',
  resolved:  'bg-green-50 text-green-700',
}

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const { status: rawStatus, page: rawPage } = await searchParams
  const filter: StatusFilter =
    rawStatus === 'escalated' || rawStatus === 'active' || rawStatus === 'resolved'
      ? rawStatus
      : 'all'
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  const supabase = createSupabaseAdminClient()

  // Counts per tab (fast head queries)
  const [totalRes, activeRes, escalatedRes, resolvedRes] = await Promise.all([
    (supabase as any).from('concierge_sessions').select('*', { count: 'exact', head: true }),
    (supabase as any).from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    (supabase as any).from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'escalated'),
    (supabase as any).from('concierge_sessions').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
  ])

  const counts = {
    all:       totalRes.count      ?? 0,
    active:    activeRes.count     ?? 0,
    escalated: escalatedRes.count  ?? 0,
    resolved:  resolvedRes.count   ?? 0,
  }

  // Paginated sessions for the current tab
  let sessionsQuery = (supabase as any)
    .from('concierge_sessions')
    .select(`
      id, status, started_at, last_message_at,
      profiles(name, player_id),
      concierge_messages(id, role, text, created_at)
    `, { count: 'exact' })
    .order('last_message_at', { ascending: false })
    .range(from, to)

  if (filter !== 'all') sessionsQuery = sessionsQuery.eq('status', filter)

  const { data: sessionsData, count: tabCount } = await sessionsQuery
  const sessions: any[] = sessionsData ?? []
  const totalForTab = tabCount ?? 0

  function tabHref(key: StatusFilter, p = 1) {
    const params = new URLSearchParams()
    if (key !== 'all') params.set('status', key)
    if (p > 1) params.set('page', String(p))
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
                {sessions.map((s: any) => {
                  const msgs: any[] = s.concierge_messages ?? []
                  const lastUserMsg = [...msgs].reverse().find((m: any) => m.role === 'user')
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
                          <p className="truncate">{lastUserMsg.text}</p>
                        ) : (
                          <span className="text-zinc-300 italic">No messages</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">{msgs.length}</td>
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
