import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { ReservationRow } from '@/lib/database.types'

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  visited: 'bg-blue-100 text-blue-800',
}

type ReservationWithJoins = ReservationRow & {
  venues: { name: string } | null
  profiles: { name: string; email: string } | null
}

async function updateReservation(id: string, formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('reservations')
    .update({
      status: formData.get('status') as ReservationRow['status'],
      admin_note: (formData.get('admin_note') as string) || null,
    })
    .eq('id', id)
  revalidatePath('/dashboard/reservations')
}

export default async function ReservationsPage() {
  const supabase = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('reservations')
    .select(
      'id, date, time, people, status, occasion, note, admin_note, created_at, venue_id, user_id, venues(name), profiles(name, email)'
    )
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  const reservations: ReservationWithJoins[] = data ?? []

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Reservations</h1>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Date / Time</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Guest</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Ppl</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Guest note</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Admin note / Save</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map(r => {
              const statusClass =
                STATUS_CLASSES[r.status] ?? 'bg-zinc-100 text-zinc-700'
              return (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 last:border-0 align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{r.date}</p>
                    <p className="text-xs text-zinc-400">{r.time}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{r.venues?.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-900">{r.profiles?.name}</p>
                    <p className="text-xs text-zinc-400">{r.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{r.people}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 max-w-[140px]">
                    {r.occasion && <p className="mb-0.5 text-zinc-400">🎉 {r.occasion}</p>}
                    {r.note ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={updateReservation.bind(null, r.id)}
                      className="flex flex-col gap-1.5"
                    >
                      <select
                        name="status"
                        defaultValue={r.status}
                        className="text-xs px-2 py-1 rounded-md border border-zinc-200 bg-white text-zinc-700"
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="visited">visited</option>
                      </select>
                      <input
                        type="text"
                        name="admin_note"
                        defaultValue={r.admin_note ?? ''}
                        placeholder="Admin note…"
                        className="text-xs px-2 py-1 rounded-md border border-zinc-200 bg-white text-zinc-700 w-36"
                      />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-md bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
