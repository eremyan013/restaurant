import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

const ACTION_LABELS: Record<string, string> = {
  confirm_reservation:     'Confirmed reservation',
  cancel_reservation:      'Cancelled reservation',
  mark_visited:            'Marked visited',
  update_reservation_note: 'Updated note',
  approve_review:          'Approved review',
  hide_review:             'Hid review',
  delete_review:           'Deleted review',
  adjust_yel:              'Adjusted Yel points',
  bulk_adjust_yel:         'Bulk Yel adjustment',
  update_venue:            'Updated venue',
  delete_venue:            'Deleted venue',
  create_venue:            'Created venue',
  toggle_prize:            'Toggled prize',
  delete_prize:            'Deleted prize',
  create_prize:            'Created prize',
  mark_prize_used:         'Redeemed prize',
  resolve_concierge:       'Resolved concierge',
  escalate_concierge:      'Escalated concierge',
}

const ACTION_COLORS: Record<string, string> = {
  confirm_reservation: 'bg-green-50 text-green-700',
  cancel_reservation:  'bg-red-50 text-red-600',
  mark_visited:        'bg-blue-50 text-blue-700',
  approve_review:      'bg-green-50 text-green-700',
  hide_review:         'bg-zinc-100 text-zinc-500',
  delete_review:       'bg-red-50 text-red-600',
  adjust_yel:          'bg-amber-50 text-amber-700',
  bulk_adjust_yel:     'bg-amber-50 text-amber-700',
  mark_prize_used:     'bg-violet-50 text-violet-700',
  delete_venue:        'bg-red-50 text-red-600',
  delete_prize:        'bg-red-50 text-red-600',
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string; action?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const params     = await searchParams
  const filterAdmin  = params.admin  ?? ''
  const filterAction = params.action ?? ''

  const supabase = createSupabaseAdminClient()

  let query = (supabase as any)
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterAdmin)  query = query.eq('admin_id', filterAdmin)
  if (filterAction) query = query.eq('action', filterAction)

  const { data: logs } = await query
  const entries: any[] = logs ?? []

  // Unique admins for filter dropdown
  const { data: adminsData } = await (supabase as any)
    .from('admin_activity_log')
    .select('admin_id, admin_name')
    .limit(500)

  const adminSet = new Map<string, string>()
  for (const r of (adminsData ?? [])) {
    if (r.admin_id) adminSet.set(r.admin_id, r.admin_name ?? r.admin_id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Activity Log</h1>
        <span className="text-sm text-zinc-400">{entries.length} entries</span>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <select name="admin" defaultValue={filterAdmin}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900">
          <option value="">All admins</option>
          {Array.from(adminSet.entries()).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select name="action" defaultValue={filterAction}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900">
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button type="submit"
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          Filter
        </button>
        {(filterAdmin || filterAction) && (
          <a href="/dashboard/activity"
            className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors">
            Clear
          </a>
        )}
      </form>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">When</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Admin</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Action</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Subject</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                  <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap tabular-nums">
                    {new Date(e.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{e.admin_name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[e.action] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 max-w-xs">
                    <p className="truncate">{e.entity_name ?? e.entity_id ?? '—'}</p>
                    {e.entity_type && (
                      <p className="text-xs text-zinc-400">{e.entity_type}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs">
                    {e.details && Object.keys(e.details).length > 0 ? (
                      <span className="font-mono">
                        {Object.entries(e.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </span>
                    ) : '—'}
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
