import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { ReservationRow } from '@/lib/database.types'
import { ReservationFilters } from '@/components/reservation-filters'

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

type FilterParams = {
  status?:     string
  from?:       string
  to?:         string
  venue?:      string
  guest?:      string
  people_min?: string
  people_max?: string
  note?:       string
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  const sp = await searchParams
  const activeTab: Tab = (TABS.includes(sp.status as Tab) ? sp.status : 'all') as Tab

  const supabase = createSupabaseAdminClient()

  // ── Venues list for filter dropdown ──────────────────────────────────────────
  let venuesList: { id: string; name: string }[] = []
  if (admin.role === 'super_admin') {
    const { data } = await supabase.from('venues').select('id, name').order('name')
    venuesList = data ?? []
  } else if (admin.managed_venue_ids.length > 1) {
    const { data } = await (supabase as any)
      .from('venues').select('id, name').in('id', admin.managed_venue_ids).order('name')
    venuesList = data ?? []
  }

  // ── Guest pre-filter (resolve matching user IDs) ──────────────────────────────
  let guestUserIds: string[] | null = null
  if (sp.guest?.trim()) {
    const { data: matched } = await (supabase as any)
      .from('profiles')
      .select('id')
      .or(`name.ilike.%${sp.guest.trim()}%,email.ilike.%${sp.guest.trim()}%`)
    guestUserIds = (matched ?? []).map((p: { id: string }) => p.id)
  }

  // ── Helper: apply all non-status filters to a query ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any) {
    // Admin scope
    if (admin!.role === 'admin' && admin!.managed_venue_ids.length) {
      const scopeVenue = sp.venue && admin!.managed_venue_ids.includes(sp.venue) ? sp.venue : null
      q = scopeVenue ? q.eq('venue_id', scopeVenue) : q.in('venue_id', admin!.managed_venue_ids)
    } else if (admin!.role === 'super_admin' && sp.venue) {
      q = q.eq('venue_id', sp.venue)
    }

    if (sp.from)        q = q.gte('date', sp.from)
    if (sp.to)          q = q.lte('date', sp.to)
    if (sp.people_min)  q = q.gte('people', parseInt(sp.people_min))
    if (sp.people_max)  q = q.lte('people', parseInt(sp.people_max))
    if (sp.note?.trim()) q = q.or(`note.ilike.%${sp.note.trim()}%,admin_note.ilike.%${sp.note.trim()}%,occasion.ilike.%${sp.note.trim()}%`)

    if (guestUserIds !== null) {
      q = guestUserIds.length === 0
        ? q.eq('user_id', '00000000-0000-0000-0000-000000000000')
        : q.in('user_id', guestUserIds)
    }

    return q
  }

  // ── Main query ────────────────────────────────────────────────────────────────
  let query = (supabase as any)
    .from('reservations')
    .select('id, date, time, people, status, occasion, note, admin_note, created_at, venue_id, user_id, venues(name), profiles(name, email)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)

  query = applyFilters(query)
  if (activeTab !== 'all') query = query.eq('status', activeTab)

  const { data, error } = await query
  if (error) throw error
  const reservations: ReservationWithJoins[] = data ?? []

  // ── Status counts (filtered, without status restriction) ─────────────────────
  let countsQuery = applyFilters(
    (supabase as any).from('reservations').select('status').limit(2000)
  )
  const { data: counts } = await countsQuery

  const countMap: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, visited: 0 }
  for (const r of (counts ?? [])) countMap[r.status] = (countMap[r.status] ?? 0) + 1
  const total = Object.values(countMap).reduce((a, b) => a + b, 0)

  // ── Tab URL builder: preserves all active filters, changes only status ────────
  function tabHref(tab: Tab) {
    const p = new URLSearchParams()
    if (sp.from)       p.set('from',       sp.from)
    if (sp.to)         p.set('to',         sp.to)
    if (sp.venue)      p.set('venue',      sp.venue)
    if (sp.guest)      p.set('guest',      sp.guest)
    if (sp.people_min) p.set('people_min', sp.people_min)
    if (sp.people_max) p.set('people_max', sp.people_max)
    if (sp.note)       p.set('note',       sp.note)
    if (tab !== 'all') p.set('status',     tab)
    const qs = p.toString()
    return `/dashboard/reservations${qs ? '?' + qs : ''}`
  }

  const showVenueCol = admin.role === 'super_admin' || admin.managed_venue_ids.length > 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Reservations</h1>
        <span className="text-sm text-zinc-400">{total} total</span>
      </div>

      {/* Filters */}
      <ReservationFilters venues={venuesList} />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-100 p-1 rounded-lg w-fit overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab === 'all' ? total : (countMap[tab] ?? 0)
          const isActive = activeTab === tab
          return (
            <a
              key={tab}
              href={tabHref(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
          No reservations match the current filters.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">Date / Time</th>
                {showVenueCol && <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>}
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
                    {showVenueCol && (
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
