import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { ReservationRow } from '@/lib/database.types'

const STATUS_CLASSES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  visited:   'bg-blue-100 text-blue-800',
}

type ReservationWithJoins = ReservationRow & {
  venues:   { name: string } | null
  profiles: { name: string; email: string } | null
}

async function setStatus(id: string, status: ReservationRow['status']) {
  'use server'
  const admin = await getCurrentAdmin()
  if (!admin) return

  const supabase = createSupabaseAdminClient()

  // Fetch reservation to verify venue ownership for restricted admins
  const { data: res } = await (supabase as any)
    .from('reservations')
    .select('user_id, venue_id, date, time, venues(name), profiles(push_token)')
    .eq('id', id)
    .single()

  if (!res) return
  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(res.venue_id)) return

  await (supabase as any).from('reservations').update({ status }).eq('id', id)

  if (res?.profiles?.push_token && (status === 'confirmed' || status === 'cancelled')) {
    const venueName: string = res.venues?.name ?? 'your reservation'
    const title = status === 'confirmed' ? '✅ Booking Confirmed' : '❌ Booking Cancelled'
    const body  = status === 'confirmed'
      ? `Your table at ${venueName} on ${res.date} at ${res.time} is confirmed!`
      : `Your reservation at ${venueName} on ${res.date} has been cancelled.`

    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: res.profiles.push_token, title, body, sound: 'default' }),
    }).catch(() => {})
  }

  revalidatePath('/dashboard/reservations')
}

async function saveNote(id: string, formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (!admin) return

  const supabase = createSupabaseAdminClient()

  if (admin.role === 'admin') {
    const { data: res } = await (supabase as any).from('reservations').select('venue_id').eq('id', id).single()
    if (!admin.managed_venue_ids.includes(res?.venue_id)) return
  }

  await (supabase as any)
    .from('reservations')
    .update({
      status:     formData.get('status') as ReservationRow['status'],
      admin_note: (formData.get('admin_note') as string) || null,
    })
    .eq('id', id)
  revalidatePath('/dashboard/reservations')
}

const TABS = ['all', 'pending', 'confirmed', 'cancelled', 'visited'] as const
type Tab = typeof TABS[number]

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  const { status: statusFilter } = await searchParams
  const activeTab: Tab = (TABS.includes(statusFilter as Tab) ? statusFilter : 'all') as Tab

  const supabase = createSupabaseAdminClient()
  let query = (supabase as any)
    .from('reservations')
    .select('id, date, time, people, status, occasion, note, admin_note, created_at, venue_id, user_id, venues(name), profiles(name, email)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  // Restaurant admins only see their venues' reservations
  if (admin.role === 'admin' && admin.managed_venue_ids.length) {
    query = query.in('venue_id', admin.managed_venue_ids)
  }

  if (activeTab !== 'all') query = query.eq('status', activeTab)

  const { data, error } = await query
  if (error) throw error

  const reservations: ReservationWithJoins[] = data ?? []

  // Count per status (scoped to venue for admins)
  let countsQuery = (supabase as any).from('reservations').select('status').limit(1000)
  if (admin.role === 'admin' && admin.managed_venue_ids.length) {
    countsQuery = countsQuery.in('venue_id', admin.managed_venue_ids)
  }
  const { data: counts } = await countsQuery

  const countMap: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, visited: 0 }
  for (const r of (counts ?? [])) countMap[r.status] = (countMap[r.status] ?? 0) + 1
  const total = Object.values(countMap).reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Reservations</h1>
        <span className="text-sm text-zinc-400">{total} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => {
          const count = tab === 'all' ? total : (countMap[tab] ?? 0)
          const isActive = activeTab === tab
          return (
            <a
              key={tab}
              href={tab === 'all' ? '/dashboard/reservations' : `/dashboard/reservations?status=${tab}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-500'}`}>
                {count}
              </span>
            </a>
          )
        })}
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          No reservations{activeTab !== 'all' ? ` with status "${activeTab}"` : ''}.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">Date / Time</th>
                {admin.role === 'super_admin' && <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>}
                <th className="px-4 py-3 font-medium text-zinc-500">Guest</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Ppl</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Note</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const statusClass = STATUS_CLASSES[r.status] ?? 'bg-zinc-100 text-zinc-700'
                return (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.date}</p>
                      <p className="text-xs text-zinc-400">{r.time}</p>
                    </td>
                    {admin.role === 'super_admin' && (
                      <td className="px-4 py-3 text-zinc-700">{r.venues?.name ?? '—'}</td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-zinc-900">{r.profiles?.name ?? '—'}</p>
                      <p className="text-xs text-zinc-400">{r.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{r.people}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-[160px]">
                      {r.occasion && <p className="mb-0.5 text-zinc-400">🎉 {r.occasion}</p>}
                      <p>{r.note ?? '—'}</p>
                      {r.admin_note && <p className="mt-1 text-indigo-500">📝 {r.admin_note}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5 flex-wrap">
                          {r.status === 'pending' && (
                            <>
                              <form action={setStatus.bind(null, r.id, 'confirmed')}>
                                <button className="text-xs px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors">Confirm</button>
                              </form>
                              <form action={setStatus.bind(null, r.id, 'cancelled')}>
                                <button className="text-xs px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors">Cancel</button>
                              </form>
                            </>
                          )}
                          {r.status === 'confirmed' && (
                            <>
                              <form action={setStatus.bind(null, r.id, 'visited')}>
                                <button className="text-xs px-2.5 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors">Visited</button>
                              </form>
                              <form action={setStatus.bind(null, r.id, 'cancelled')}>
                                <button className="text-xs px-2.5 py-1 rounded-md border border-red-300 text-red-500 hover:bg-red-50 transition-colors">Cancel</button>
                              </form>
                            </>
                          )}
                          {(r.status === 'cancelled' || r.status === 'visited') && (
                            <form action={setStatus.bind(null, r.id, 'pending')}>
                              <button className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50 transition-colors">Reopen</button>
                            </form>
                          )}
                        </div>
                        <form action={saveNote.bind(null, r.id)} className="flex gap-1.5">
                          <input type="hidden" name="status" value={r.status} />
                          <input
                            type="text"
                            name="admin_note"
                            defaultValue={r.admin_note ?? ''}
                            placeholder="Admin note…"
                            className="text-xs px-2 py-1 rounded-md border border-zinc-200 bg-white text-zinc-700 w-32"
                          />
                          <button type="submit" className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-white hover:bg-zinc-600 transition-colors">Save</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
