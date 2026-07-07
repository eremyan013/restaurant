'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { createReservationAdmin, searchUsersAction, ActionState } from './actions'
import { useToast } from '@/components/toast-provider'

const TIME_SLOTS: string[] = []
for (let h = 10; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

type UserResult = { id: string; name: string; email: string; player_id: number }

interface Props {
  venues: { id: string; name: string }[]
  defaultVenueId?: string
}

const INIT_CREATE: ActionState = { ok: false }
const INIT_SEARCH: { results: UserResult[] } = { results: [] as UserResult[] }

const TODAY = new Date().toISOString().split('T')[0]

function UserSearch({ onSelect }: { onSelect: (u: UserResult) => void }) {
  const [searchState, searchAction, searching] = useActionState(searchUsersAction, INIT_SEARCH)
  return (
    <>
      <form action={searchAction} className="flex gap-2">
        <input name="q" type="text" placeholder="Search by name, email or player ID…" className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        <button type="submit" disabled={searching} className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">{searching ? '…' : 'Search'}</button>
      </form>
      {searchState.results.length > 0 && (
        <div className="mt-1.5 border border-zinc-200 rounded-lg overflow-hidden">
          {searchState.results.map((u: UserResult) => (
            <button key={u.id} type="button" onClick={() => onSelect(u)} className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0">
              <p className="text-sm font-medium text-zinc-900">{u.name}</p>
              <p className="text-xs text-zinc-400">{u.email} · #{u.player_id}</p>
            </button>
          ))}
        </div>
      )}
      {searchState.results.length === 0 && !searching && (
        <p className="text-xs text-zinc-400 mt-1.5">Search above to find a user.</p>
      )}
    </>
  )
}

export function NewReservationModal({ venues, defaultVenueId }: Props) {
  const [open, setOpen] = useState(false)
  const [createState, createAction, creating] = useActionState(createReservationAdmin, INIT_CREATE)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const toast = useToast()
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (createState.ok) {
      toast.success('Reservation created')
      setOpen(false)
      setSelectedUser(null)
      setSearchKey(k => k + 1)
    } else if (createState.error) {
      toast.error(createState.error ?? 'Failed to create reservation')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState])

  function handleClose() {
    setOpen(false)
    setSelectedUser(null)
    setSearchKey(k => k + 1)
  }

  // Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Focus trap
  useEffect(() => {
    if (!open || !modalRef.current) return
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const modal = modalRef.current
    const els = modal.querySelectorAll<HTMLElement>(FOCUSABLE)
    els[0]?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        + New Reservation
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={handleClose}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">New Reservation</h2>
              <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
            </div>

            {/* User search */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
                Guest {selectedUser && <span className="text-green-600 normal-case">✓ selected</span>}
              </label>
              {selectedUser ? (
                <div className="flex items-center justify-between px-3 py-2.5 border border-green-200 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{selectedUser.name}</p>
                    <p className="text-xs text-zinc-500">{selectedUser.email} · #{selectedUser.player_id}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-xs text-zinc-400 hover:text-zinc-600">Change</button>
                </div>
              ) : (
                <UserSearch key={searchKey} onSelect={setSelectedUser} />
              )}
            </div>

            {/* Main form */}
            <form action={createAction} className="space-y-3">
              <input type="hidden" name="user_id" value={selectedUser?.id ?? ''} />

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Venue</label>
                <select
                  name="venue_id"
                  defaultValue={defaultVenueId ?? ''}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                >
                  <option value="" disabled>Select venue…</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Date</label>
                  <input
                    name="date_iso"
                    type="date"
                    defaultValue={TODAY}
                    min={TODAY}
                    required
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Time</label>
                  <select
                    name="time"
                    defaultValue="19:00"
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
                  defaultValue={2}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Status</label>
                <select
                  name="status"
                  defaultValue="confirmed"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Occasion</label>
                <input
                  name="occasion"
                  type="text"
                  placeholder="Birthday, anniversary…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">Note</label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Dietary requirements, seating preference…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
              </div>

              {!createState.ok && createState.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createState.error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose} className="flex-1 px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedUser}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {creating ? 'Creating…' : 'Create Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
