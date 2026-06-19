'use client'

import { useActionState, useState, useEffect } from 'react'
import { editReservation, ActionState } from './actions'
import { useToast } from '@/components/toast-provider'

const TIME_SLOTS: string[] = []
for (let h = 10; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

interface Props {
  reservation: {
    id: string
    date_iso: string | null
    time: string
    people: number
    occasion: string | null
    note: string | null
  }
}

const INIT: ActionState = { ok: false }

export function ReservationEditModal({ reservation: r }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(editReservation, INIT)
  const toast = useToast()

  useEffect(() => {
    if (state.ok) {
      toast.success('Reservation updated')
      setOpen(false)
    } else if (state.error) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const defaultDate = r.date_iso ?? new Date().toISOString().split('T')[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">Edit Reservation</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
            </div>

            <form action={action} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Date</label>
                  <input
                    name="date_iso"
                    type="date"
                    defaultValue={defaultDate}
                    required
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Time</label>
                  <select
                    name="time"
                    defaultValue={r.time}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Guests</label>
                <input
                  name="people"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={r.people}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Occasion</label>
                <input
                  name="occasion"
                  type="text"
                  defaultValue={r.occasion ?? ''}
                  placeholder="Birthday, anniversary…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Guest note</label>
                <textarea
                  name="note"
                  defaultValue={r.note ?? ''}
                  rows={2}
                  placeholder="Dietary requirements, seating preference…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
              </div>

              {!state.ok && state.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                  {pending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
