'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { validateAction } from '@/lib/validate-action'
import {
  zNewReservationSchema, parseNewReservationFormData,
  zEditReservationSchema, parseEditReservationFormData,
  zRejectReservationSchema, zAssignAgentSchema,
} from '@/lib/schemas'

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

  const parsed = validateAction(zEditReservationSchema, parseEditReservationFormData(formData))
  if (!parsed.success) return parsed.state

  const { id, date_iso: dateIso, time, people, occasion, note } = parsed.data

  const supabase = createSupabaseAdminClient()

  if (admin.role === 'admin') {
    const { data: res } = await supabase.from('reservations').select('venue_id').eq('id', id).single()
    if (!admin.managed_venue_ids.includes(res?.venue_id ?? '')) return { ok: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
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

  const parsed = validateAction(zNewReservationSchema, parseNewReservationFormData(formData))
  if (!parsed.success) return parsed.state

  const { venue_id: venueId, user_id: userId, date_iso: dateIso, time, people, occasion, note, status } = parsed.data

  if (admin.role === 'admin' && !admin.managed_venue_ids.includes(venueId)) {
    return { ok: false, error: 'You can only create reservations for your venue.' }
  }

  const supabase = createSupabaseAdminClient()

  const { data: venueData } = await supabase
    .from('venues')
    .select('time_yel_map')
    .eq('id', venueId)
    .single()

  const yelMap = (venueData?.time_yel_map as Record<string, number> | null) ?? {}
  const yelEarned = String(yelMap[time] ?? 0)

  const { error } = await supabase.from('reservations').insert({
    venue_id:   venueId,
    user_id:    userId,
    date:       isoToDisplay(dateIso),
    date_iso:   dateIso,
    time,
    people,
    occasion,
    note,
    status,
    yel_earned: yelEarned,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/reservations')
  return { ok: true }
}

// ── Reject reservation ────────────────────────────────────────────────────────
export async function rejectReservation(
  id: string,
  reason: string,
): Promise<ActionState> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }

  const parsed = validateAction(zRejectReservationSchema, { id, rejection_reason: reason })
  if (!parsed.success) return parsed.state

  const supabase = createSupabaseAdminClient()

  if (admin.role === 'admin') {
    const { data: res } = await supabase.from('reservations').select('venue_id').eq('id', id).single()
    if (!admin.managed_venue_ids.includes(res?.venue_id ?? '')) return { ok: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('reservations')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/reservations')
  return { ok: true }
}

// ── Assign agent ──────────────────────────────────────────────────────────────
export async function assignAgent(
  reservationId: string,
  agentId: string,
): Promise<ActionState> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }

  const parsed = validateAction(zAssignAgentSchema, { reservation_id: reservationId, agent_id: agentId })
  if (!parsed.success) return parsed.state

  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('reservations')
    .update({ agent_id: agentId })
    .eq('id', reservationId)

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
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, player_id')
    .eq('role', 'user')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,player_id::text.ilike.%${q}%`)
    .limit(8)

  return { results: data ?? [] }
}
