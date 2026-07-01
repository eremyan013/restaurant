'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function ReservationFilters({
  venues,
}: {
  venues: { id: string; name: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()

  const [from,      setFrom]      = useState(params.get('from')       ?? '')
  const [to,        setTo]        = useState(params.get('to')         ?? '')
  const [venue,     setVenue]     = useState(params.get('venue')      ?? '')
  const [guest,     setGuest]     = useState(params.get('guest')      ?? '')
  const [peopleMin, setPeopleMin] = useState(params.get('people_min') ?? '')
  const [peopleMax, setPeopleMax] = useState(params.get('people_max') ?? '')
  const [note,      setNote]      = useState(params.get('note')       ?? '')

  useEffect(() => {
    setFrom(params.get('from')       ?? '')
    setTo(params.get('to')           ?? '')
    setVenue(params.get('venue')     ?? '')
    setGuest(params.get('guest')     ?? '')
    setPeopleMin(params.get('people_min') ?? '')
    setPeopleMax(params.get('people_max') ?? '')
    setNote(params.get('note')       ?? '')
  }, [params])

  const hasFilters = !!(from || to || venue || guest || peopleMin || peopleMax || note)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const sp = new URLSearchParams()

    // Preserve active status tab
    const status = params.get('status')
    if (status) sp.set('status', status)

    const fields = ['from', 'to', 'venue', 'guest', 'people_min', 'people_max', 'note']
    for (const key of fields) {
      const val = (fd.get(key) as string | null)?.trim()
      if (val) sp.set(key, val)
    }

    router.push(`/dashboard/reservations?${sp.toString()}`)
  }

  function clearFilters() {
    const status = params.get('status')
    router.push(`/dashboard/reservations${status ? `?status=${status}` : ''}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-zinc-200 p-4 mb-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Date from</label>
          <input
            type="date"
            name="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm bg-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Date to</label>
          <input
            type="date"
            name="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm bg-white"
          />
        </div>

        {/* Venue (super_admin or multi-venue admin) */}
        {venues.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Venue</label>
            <select
              name="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-200 text-sm bg-white"
            >
              <option value="">All venues</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Guest */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Guest (name or email)</label>
          <input
            type="text"
            name="guest"
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            placeholder="Search guest…"
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm"
          />
        </div>

        {/* People range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">People min</label>
          <input
            type="number"
            name="people_min"
            value={peopleMin}
            onChange={(e) => setPeopleMin(e.target.value)}
            min="1"
            placeholder="Any"
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">People max</label>
          <input
            type="number"
            name="people_max"
            value={peopleMax}
            onChange={(e) => setPeopleMax(e.target.value)}
            min="1"
            placeholder="Any"
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm"
          />
        </div>

        {/* Note / occasion keyword */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Note / occasion</label>
          <input
            type="text"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Search notes…"
            className="h-9 px-3 rounded-lg border border-zinc-200 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Apply filters
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50 transition-colors"
          >
            Clear filters
          </button>
        )}
        {hasFilters && (
          <span className="text-xs text-zinc-400">
            {[from && 'date', venue && 'venue', guest && 'guest', (peopleMin || peopleMax) && 'people', note && 'note']
              .filter(Boolean).join(', ')} filtered
          </span>
        )}
      </div>
    </form>
  )
}
