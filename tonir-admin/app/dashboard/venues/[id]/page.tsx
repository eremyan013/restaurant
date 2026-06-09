import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { DeleteButton } from '@/components/delete-button'
import { VenueFormClient, type VenueFormDefaults } from '@/components/venue-form-client'
import type { VenueHoursRow, VenueBlockedDateRow } from '@/lib/database.types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

async function saveVenueHours(venueId: string, formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()
  const upserts = Array.from({ length: 7 }, (_, day) => ({
    venue_id:    venueId,
    day_of_week: day,
    is_open:     formData.get(`is_open_${day}`) === 'true',
    open_time:   (formData.get(`open_time_${day}`) as string) || null,
    close_time:  (formData.get(`close_time_${day}`) as string) || null,
  }))
  await (supabase as any)
    .from('venue_hours')
    .upsert(upserts, { onConflict: 'venue_id,day_of_week' })
  revalidatePath(`/dashboard/venues/${venueId}`)
}

async function addBlockedDate(venueId: string, formData: FormData) {
  'use server'
  const date   = (formData.get('date') as string)?.trim()
  const reason = (formData.get('reason') as string)?.trim() || null
  if (!date) return
  const supabase = createSupabaseAdminClient()
  await (supabase as any)
    .from('venue_blocked_dates')
    .upsert({ venue_id: venueId, date, reason }, { onConflict: 'venue_id,date' })
  revalidatePath(`/dashboard/venues/${venueId}`)
}

async function removeBlockedDate(venueId: string, dateId: string) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('venue_blocked_dates').delete().eq('id', dateId)
  revalidatePath(`/dashboard/venues/${venueId}`)
}

async function updateVenue(id: string, formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()

  const g = (key: string) => (formData.get(key) as string) || ''
  const arr = (key: string) => g(key).split(',').map(s => s.trim()).filter(Boolean)

  const name_hy = g('name_hy')

  const { error } = await (supabase as any)
    .from('venues')
    .update({
      name:           name_hy || g('name_ru') || g('name_en'),
      name_hy:        name_hy        || null,
      name_ru:        g('name_ru')   || null,
      name_en:        g('name_en')   || null,
      cuisine:        g('cuisine_hy') || g('cuisine_ru') || g('cuisine_en'),
      cuisine_hy:     g('cuisine_hy')     || null,
      cuisine_ru:     g('cuisine_ru')     || null,
      cuisine_en:     g('cuisine_en')     || null,
      area:           g('area_hy') || g('area_ru') || g('area_en'),
      area_hy:        g('area_hy')        || null,
      area_ru:        g('area_ru')        || null,
      area_en:        g('area_en')        || null,
      description:    g('description_hy') || g('description_ru') || g('description_en'),
      description_hy: g('description_hy') || null,
      description_ru: g('description_ru') || null,
      description_en: g('description_en') || null,
      perk:           g('perk_hy') || g('perk_ru') || g('perk_en'),
      perk_hy:        g('perk_hy')        || null,
      perk_ru:        g('perk_ru')        || null,
      perk_en:        g('perk_en')        || null,
      tags:           arr('tags_hy'),
      tags_hy:        arr('tags_hy').length ? arr('tags_hy') : null,
      tags_ru:        arr('tags_ru').length ? arr('tags_ru') : null,
      tags_en:        arr('tags_en').length ? arr('tags_en') : null,
      price:          g('price'),
      rating:         parseFloat(g('rating')) || 0,
      reviews_count:  parseInt(g('reviews_count')) || 0,
      photo_url:      g('photo_url'),
      dish_url:       g('dish_url'),
      distance_km:    g('distance_km'),
      booked_today:   parseInt(g('booked_today')) || 0,
      heat:           g('heat') as 'high' | 'med' | 'low',
      kind:           g('kind') as 'restaurant' | 'bar' | 'lounge' | 'club',
      coord_x:        parseFloat(g('coord_x')) || 0,
      coord_y:        parseFloat(g('coord_y')) || 0,
      times:          arr('times'),
      is_active:      g('is_active') === 'true',
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

async function deleteVenue(id: string) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('venues').delete().eq('id', id)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

export default async function EditVenuePage() {
  return <div style={{ padding: 32, fontFamily: 'sans-serif' }}>Hello — module loaded OK</div>
}

async function renderPage(id: string) {
  const supabase = createSupabaseAdminClient()

  const [venueRes, hoursRes, blockedRes] = await Promise.all([
    (supabase as any).from('venues').select('*').eq('id', id).single(),
    (supabase as any).from('venue_hours').select('*').eq('venue_id', id).order('day_of_week'),
    (supabase as any).from('venue_blocked_dates').select('*').eq('venue_id', id).order('date'),
  ])

  if (venueRes.error || !venueRes.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-mono">
        venues query failed: {venueRes.error?.message ?? 'not found'}
      </div>
    )
  }

  const venue    = venueRes.data
  const hoursRaw = hoursRes.data
  const blockedRaw = blockedRes.data

  if (hoursRes.error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-mono">
        venue_hours query failed: {hoursRes.error.message}
      </div>
    )
  }
  if (blockedRes.error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-mono">
        venue_blocked_dates query failed: {blockedRes.error.message}
      </div>
    )
  }

  const hoursMap: Record<number, VenueHoursRow> = {}
  for (const h of (hoursRaw ?? [])) hoursMap[h.day_of_week] = h

  const blockedDates: VenueBlockedDateRow[] = blockedRaw ?? []

  const defaults: VenueFormDefaults = {
    id:             venue.id,
    name_hy:        venue.name_hy        ?? venue.name,
    name_ru:        venue.name_ru        ?? '',
    name_en:        venue.name_en        ?? '',
    cuisine_hy:     venue.cuisine_hy     ?? venue.cuisine,
    cuisine_ru:     venue.cuisine_ru     ?? '',
    cuisine_en:     venue.cuisine_en     ?? '',
    area_hy:        venue.area_hy        ?? venue.area,
    area_ru:        venue.area_ru        ?? '',
    area_en:        venue.area_en        ?? '',
    description_hy: venue.description_hy ?? venue.description,
    description_ru: venue.description_ru ?? '',
    description_en: venue.description_en ?? '',
    perk_hy:        venue.perk_hy        ?? venue.perk,
    perk_ru:        venue.perk_ru        ?? '',
    perk_en:        venue.perk_en        ?? '',
    tags_hy:        (venue.tags_hy ?? venue.tags ?? []).join(', '),
    tags_ru:        (venue.tags_ru ?? []).join(', '),
    tags_en:        (venue.tags_en ?? []).join(', '),
    price:          venue.price,
    rating:         String(venue.rating),
    reviews_count:  String(venue.reviews_count),
    photo_url:      venue.photo_url,
    dish_url:       venue.dish_url,
    distance_km:    venue.distance_km,
    booked_today:   String(venue.booked_today),
    heat:           venue.heat,
    kind:           venue.kind,
    coord_x:        String(venue.coord_x),
    coord_y:        String(venue.coord_y),
    times:          (venue.times ?? []).join(', '),
    is_active:      String(venue.is_active),
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/venues" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Venues
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit: {venue.name_hy ?? venue.name}</h1>
      </div>

      <VenueFormClient action={updateVenue.bind(null, id)} defaults={defaults} />

      {/* ── Opening Hours ───────────────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Opening Hours</h2>
        <form action={saveVenueHours.bind(null, id)}>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500 w-32">Day</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 w-24">Open?</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Opens at</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Closes at</th>
                </tr>
              </thead>
              <tbody>
                {DAY_NAMES.map((name, day) => {
                  const h = hoursMap[day]
                  const isOpen = h ? h.is_open : true
                  return (
                    <tr key={day} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-zinc-700">{name}</td>
                      <td className="px-4 py-3">
                        <select
                          name={`is_open_${day}`}
                          defaultValue={isOpen ? 'true' : 'false'}
                          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        >
                          <option value="true">Open</option>
                          <option value="false">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          name={`open_time_${day}`}
                          defaultValue={h?.open_time ?? '10:00'}
                          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          name={`close_time_${day}`}
                          defaultValue={h?.close_time ?? '23:00'}
                          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="submit"
            className="mt-3 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            Save hours
          </button>
        </form>
      </div>

      {/* ── Blocked Dates ───────────────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Blocked Dates</h2>

        {blockedDates.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {blockedDates.map((bd) => (
                  <tr key={bd.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900 tabular-nums">{bd.date}</td>
                    <td className="px-4 py-3 text-zinc-500">{bd.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={removeBlockedDate.bind(null, id, bd.id)}>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                          onClick={e => { if (!confirm(`Remove blocked date ${bd.date}?`)) e.preventDefault() }}
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addBlockedDate.bind(null, id)} className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Date</label>
            <input
              type="date"
              name="date"
              required
              className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-zinc-500">Reason (optional)</label>
            <input
              type="text"
              name="reason"
              placeholder="e.g. Private event, Holiday"
              className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shrink-0"
          >
            Block date
          </button>
        </form>
      </div>

      <form action={deleteVenue.bind(null, id)} className="mt-6">
        <DeleteButton
          label="Delete venue"
          confirmMessage={`Delete "${venue.name_hy ?? venue.name}"? This cannot be undone.`}
        />
      </form>
    </div>
  )
}
