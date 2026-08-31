import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { requirePagePermission } from '@/lib/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { notifyWaitlist } from './actions'

export const dynamic = 'force-dynamic'

type EntryRow = {
  id: string
  venue_id: string
  desired_date: string | null
  created_at: string
  notified_at: string | null
  profiles: { name: string; push_token: string | null } | null
}

export default async function WaitlistPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'reservations', 'view')

  const supabase = createSupabaseAdminClient()

  // Fetch all waitlist entries with profile info, oldest first
  let query = supabase
    .from('waitlist_entries')
    .select('id, venue_id, desired_date, created_at, notified_at, profiles!waitlist_entries_user_id_fkey(name, push_token)')
    .order('created_at', { ascending: true })

  // Scope to managed venues for non-super-admins
  if (admin.role === 'admin' && admin.managed_venue_ids?.length) {
    query = query.in('venue_id', admin.managed_venue_ids)
  }

  const { data: entries } = await query

  // Fetch venue names for display
  const { data: venues } = await supabase.from('venues').select('id, name')
  const venueMap = new Map((venues ?? []).map((v) => [v.id, v.name]))

  // Group entries by venue, split into waiting / already notified
  const groups = new Map<string, { waiting: EntryRow[]; notified: EntryRow[] }>()
  for (const entry of (entries ?? []) as EntryRow[]) {
    if (!groups.has(entry.venue_id)) {
      groups.set(entry.venue_id, { waiting: [], notified: [] })
    }
    const g = groups.get(entry.venue_id)!
    if (entry.notified_at) g.notified.push(entry)
    else g.waiting.push(entry)
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>

      {groups.size === 0 && (
        <p className="text-gray-500">No waitlist entries yet.</p>
      )}

      {[...groups.entries()].map(([venueId, { waiting, notified }]) => {
        // Bind the venue id so the server action receives it without inline async
        const notifyAction = notifyWaitlist.bind(null, venueId)

        return (
          <div
            key={venueId}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {venueMap.get(venueId) ?? venueId}
              </h2>
              <span className="text-sm text-gray-500">
                {waiting.length} waiting &middot; {notified.length} notified
              </span>
            </div>

            {waiting.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Waiting
                </p>
                <ul className="divide-y divide-gray-100">
                  {waiting.map((e) => (
                    <li
                      key={e.id}
                      className="py-2 flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-gray-800">
                        {e.profiles?.name ?? '—'}
                      </span>
                      <span className="text-gray-400">
                        {e.desired_date
                          ? `Preferred: ${e.desired_date}`
                          : 'Any date'}{' '}
                        &middot; {new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
                <form action={notifyAction}>
                  <button
                    type="submit"
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Notify all ({waiting.length} waiting)
                  </button>
                </form>
              </div>
            )}

            {notified.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                  {notified.length} already notified
                </summary>
                <ul className="mt-2 divide-y divide-gray-100">
                  {notified.map((e) => (
                    <li
                      key={e.id}
                      className="py-2 flex items-center justify-between text-gray-400"
                    >
                      <span>{e.profiles?.name ?? '—'}</span>
                      <span>
                        Notified{' '}
                        {e.notified_at
                          ? new Date(e.notified_at).toLocaleDateString()
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}
