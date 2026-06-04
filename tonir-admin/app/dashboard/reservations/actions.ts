'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export type ActionState = { ok: false; error?: string } | { ok: true }

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// ── Edit existing reservation ──────────────────────────────────────────────────
export async function editReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }

  const id       = (formData.get('id')       as string)?.trim()
  const dateIso  = (formData.get('date_iso') as string)?.trim()
  const time     = (formData.get('time')     as string)?.trim()
  const people   = parseInt(formData.get('people') as string, 10)
  const occasion = (formData.get('occasion') as string)?.trim() || null
  const note     = (formData.get('note')     as string)?.trim() || null

  if (!id || !dateIso || !time || isNaN(people) || people < 1) {
    return { ok: false, error: 'Date, time and number of guests are required.' }
  }

  const supabase = createSupabaseAdminClient()

  if (admin.role === 'admin') {
    const { data: res } = await (supabase as any).from('reservations').select('venue_id').eq('id', id).single()
    if (!admin.managed_venue_ids.includes(res?.venue_id)) return { ok: false, error: 'Unauthorized' }
  }

  const { error } = await (supabase as any)
    .from('reservations')
    .update({ date: isoToDisplay(dateIso), date_iso: dateIso, time, people, occasion, note })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/reservations')
  return { ok: true }
}

// ── Create reservation from admin ─────────────────────────────────────────────
export async function createReservationAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }

  const venueId  = (formData.get('venue_id')  as string)?.trim()
  const userId   = (formData.get('user_id')   as string)?.trim()
  const dateIso  = (formData.get('date_iso')  as string)?.trim()
  const time     = (formData.get('time')      as string)?.trim()
  const people   = parseInt(formData.get('people') as string, 10)
  const occasion = (formData.get('occasion')  as string)?.trim() || null
  const note     = (formData.get('note')      as string)?.trim() || null
  const status   = (formData.get('status')    as string)?.trim() || 'confirmed'

  if (!venueId || !userId || !dateIso || !time || isNaN(people) || people < 1) {
    return { ok: false, error: 'Venue, user, date, time and guests are required.' }
  }

  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(venueId)) {
    return { ok: false, error: 'You can only create reservations for your venue.' }
  }

  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('reservations').insert({
    venue_id:   venueId,
    user_id:    userId,
    date:       isoToDisplay(dateIso),
    date_iso:   dateIso,
    time,
    people,
    occasion,
    note,
    status,
    yel_earned: '0',
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/reservations')
  return { ok: true }
}

// ── User search for reservation form ──────────────────────────────────────────
export async function searchUsersAction(
  _prev: { results: { id: string; name: string; email: string; player_id: number }[] },
  formData: FormData,
) {
  const q = (formData.get('q') as string)?.trim()
  if (!q || q.length < 2) return { results: [] }

  const admin = await getCurrentAdmin()
  if (!admin) return { results: [] }

  const supabase = createSupabaseAdminClient()
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, name, email, player_id')
    .eq('role', 'user')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,player_id::text.ilike.%${q}%`)
    .limit(8)

  return { results: data ?? [] }
}
