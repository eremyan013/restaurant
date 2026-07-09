import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { logActivity } from '@/lib/log-activity'

export const metadata: Metadata = { title: 'Reservations — Tonir Admin' }
import type { ReservationRow } from '@/lib/database.types'
import { ReservationFilters } from '@/components/reservation-filters'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'
import { ReservationEditModal } from './reservation-edit-modal'
import { NewReservationModal } from './new-reservation-modal'
import { NoteForm } from './note-form'
import { ReservationStatusButtons } from '@/components/reservation-status-buttons'
import { requirePagePermission } from '@/lib/permissions'

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

  type ResRow = {
    user_id: string; venue_id: string; date: string; time: string; status: string; yel_earned: string | null
    venues: { name: string } | null
    profiles: { push_token: string | null } | null
  }
  const { data: res } = await supabase
    .from('reservations')
    .select('user_id, venue_id, date, time, status, yel_earned, venues(name), profiles(push_token)')
    .eq('id', id)
    .single() as unknown as { data: ResRow | null }

  if (!res) return
  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(res.venue_id)) return

  await supabase.from('reservations').update({ status }).eq('id', id)
  await logActivity(admin, status === 'confirmed' ? 'confirm_reservation' : status === 'cancelled' ? 'cancel_reservation' : status === 'visited' ? 'mark_visited' : 'confirm_reservation',
    'reservation', id, `${res.venues?.name ?? ''} – ${res.date} ${res.time}`)

  // Credit YEL and increment visit count on first transition to visited
  if (status === 'visited' && res.status !== 'visited') {
    const yelEarned = Number(res.yel_earned ?? 0)
    const { data: profile } = await supabase
      .from('profiles')
      .select('yel_points, total_visits')
      .eq('id', res.user_id)
      .single()
    if (profile) {
      await supabase.from('profiles').update({
        total_visits: (profile.total_visits ?? 0) + 1,
        ...(yelEarned > 0 && { yel_points: (profile.yel_points ?? 0) + yelEarned }),
      }).eq('id', res.user_id)
    }
  }

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

export async function saveNote(id: string, formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (!admin) return

  const supabase = createSupabaseAdminClient()

  if (admin.role === 'admin') {
    const { data: res } = await supabase.from('reservations').select('venue_id').eq('id', id).single()
    if (!admin.managed_venue_ids.includes(res?.venue_id ?? '')) return
  }

  const rawStatus = formData.get('status') as string
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'visited'] as const
  if (!validStatuses.includes(rawStatus as typeof validStatuses[number])) return

  const adminNote = ((formData.get('admin_note') as string) ?? '').slice(0, 500) || null

  await supabase
    .from('reservations')
    .update({
      status:     rawStatus as ReservationRow['status'],
      admin_note: adminNote,
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
  page?:       string
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'reservations', 'view')

  const sp = await searchParams
  const activeTab: Tab = (TABS.includes(sp.status as Tab) ? sp.status : 'all') as Tab
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const supabase = createSupabaseAdminClient()

  // ── Venues list for filter dropdown ──────────────────────────────────────────
  let venuesList: { id: string; name: string }[] = []
  if (admin.role === 'super_admin') {
    const { data } = await supabase.from('venues').select('id, name').order('name')
    venuesList = data ?? []
  } else if (admin.managed_venue_ids.length) {
    const { data } = await supabase
      .from('venues').select('id, name').in('id', admin.managed_venue_ids).order('name')
    venuesList = data ?? []
  }

  // ── Guest pre-filter (resolve matching user IDs) ──────────────────────────────
  let guestUserIds: string[] | null = null
  if (sp.guest?.trim()) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .or(`name.ilike.%${sp.guest.trim()}%,email.ilike.%${sp.guest.trim()}%`)
    guestUserIds = (matched ?? []).map((p: { id: string }) => p.id)
  }

  // ── Helper: apply all non-status filters to a query ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase builder type is not publicly exported
  function applyFilters(q: any) {
    // Admin scope
    if (admin!.role === 'admin' && admin!.managed_venue_ids.length) {
      const scopeVenue = sp.venue && admin!.managed_venue_ids.includes(sp.venue) ? sp.venue : null
      q = scopeVenue ? q.eq('venue_id', scopeVenue) : q.in('venue_id', admin!.managed_venue_ids)
    } else if (admin!.role === 'super_admin' && sp.venue) {
      q = q.eq('venue_id', sp.venue)
    }

    if (sp.from)        q = q.gte('date_iso', sp.from)
    if (sp.to)          q = q.lte('date_iso', sp.to)
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
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  let query = supabase
    .from('reservations')
    .select('id, date, date_iso, time, people, status, occasion, note, admin_note, created_at, updated_at, yel_earned, venue_id, user_id, venues(name), profiles(name, email)', { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  query = applyFilters(query)
  if (activeTab !== 'all') query = query.eq('status', activeTab)

  const { data, error, count: filteredCount } = await query
  if (error) throw error
  const reservations: ReservationWithJoins[] = data ?? []
  const totalFiltered = filteredCount ?? 0

  // ── Status counts (filtered, without status restriction) ─────────────────────
  const [pendingRes, confirmedRes, cancelledRes, visitedRes] = await Promise.all([
    applyFilters(supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    applyFilters(supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')),
    applyFilters(supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')),
    applyFilters(supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'visited')),
  ])

  const countMap: Record<string, number> = {
    pending:   pendingRes.count   ?? 0,
    confirmed: confirmedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
    visited:   visitedRes.count   ?? 0,
  }
  const total = Object.values(countMap).reduce((a, b) => a + b, 0)

  // ── URL builders ──────────────────────────────────────────────────────────────
  function baseParams(overrides: Record<string, string | undefined> = {}) {
    const p = new URLSearchParams()
    if (sp.from)       p.set('from',       sp.from)
    if (sp.to)         p.set('to',         sp.to)
    if (sp.venue)      p.set('venue',      sp.venue)
    if (sp.guest)      p.set('guest',      sp.guest)
    if (sp.people_min) p.set('people_min', sp.people_min)
    if (sp.people_max) p.set('people_max', sp.people_max)
    if (sp.note)       p.set('note',       sp.note)
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined) p.set(k, v); else p.delete(k)
    }
    return p
  }

  function tabHref(tab: Tab) {
    const p = baseParams({ status: tab !== 'all' ? tab : undefined, page: undefined })
    const qs = p.toString()
    return `/dashboard/reservations${qs ? '?' + qs : ''}`
  }

  function pageHref(p: number) {
    const params = baseParams({
      status: activeTab !== 'all' ? activeTab : undefined,
      page: p > 1 ? String(p) : undefined,
    })
    const qs = params.toString()
    return `/dashboard/reservations${qs ? '?' + qs : ''}`
  }

  const showVenueCol = admin.role === 'super_admin' || admin.managed_venue_ids.length > 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Reservations</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{total} total</span>
          <NewReservationModal
            venues={venuesList.length ? venuesList : []}
            defaultVenueId={admin.role === 'admin' && admin.managed_venue_ids.length === 1 ? admin.managed_venue_ids[0] : undefined}
          />
        </div>
      </div>

      {/* Filters */}
      <ReservationFilters venues={venuesList} />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab === 'all' ? total : (countMap[tab] ?? 0)
          const isActive = activeTab === tab
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-500'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          No reservations match the current filters.
        </div>
      ) : (
        <>
        <div className="relative">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Date / Time</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Created</th>
                {showVenueCol && <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Venue</th>}
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Guest</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Ppl</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Note</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const statusClass = STATUS_CLASSES[r.status] ?? 'bg-zinc-100 text-zinc-700'
                return (
                  <tr key={r.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.date}</p>
                      <p className="text-xs text-zinc-400">{r.time}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-zinc-400 whitespace-nowrap">
                      {r.created_at ? (
                        <>
                          <p>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yerevan' })}</p>
                          <p>{new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yerevan' })}</p>
                        </>
                      ) : '—'}
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
                      {r.occasion && <p className="mb-0.5 text-zinc-400"><span aria-hidden="true">🎉 </span>{r.occasion}</p>}
                      <p>{r.note ?? '—'}</p>
                      {r.admin_note && <p className="mt-1 text-indigo-500"><span aria-hidden="true">📝 </span>{r.admin_note}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5 flex-wrap">
                          <ReservationEditModal reservation={{
                            id: r.id,
                            date_iso: r.date_iso,
                            time: r.time,
                            people: r.people,
                            occasion: r.occasion,
                            note: r.note,
                          }} />
                        </div>
                        <ReservationStatusButtons
                          status={r.status as 'pending' | 'confirmed' | 'cancelled' | 'visited'}
                          onConfirm={setStatus.bind(null, r.id, 'confirmed')}
                          onCancel={setStatus.bind(null, r.id, 'cancelled')}
                          onVisited={setStatus.bind(null, r.id, 'visited')}
                          onReopen={setStatus.bind(null, r.id, 'pending')}
                        />
                        <NoteForm
                          id={r.id}
                          status={r.status as 'pending' | 'confirmed' | 'cancelled' | 'visited'}
                          defaultNote={r.admin_note ?? ''}
                          saveNote={saveNote}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-white/80 to-transparent" />
        </div>
        <Pagination
          page={page}
          total={totalFiltered}
          prevHref={page > 1 ? pageHref(page - 1) : null}
          nextHref={page * PAGINATION_SIZE < totalFiltered ? pageHref(page + 1) : null}
        />
        </>
      )}
    </div>
  )
}
