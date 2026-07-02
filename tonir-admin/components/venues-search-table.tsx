'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { transliterate } from '@/lib/transliterate'
import { useToast } from '@/components/toast-provider'

type Venue = {
  id: string
  name: string
  name_hy: string | null
  name_ru: string | null
  name_en: string | null
  cuisine: string
  area: string
  kind: string
  rating: number | null
  reviews_count: number
  is_active: boolean
}

type Props = {
  venues: Venue[]
  toggleActive: (id: string, current: boolean) => Promise<{ ok: boolean; error?: string }>
  isSuperAdmin: boolean
}

const KIND_OPTIONS = ['restaurant', 'bar', 'lounge', 'club']
const RATING_OPTIONS = [
  { label: 'Any rating', min: 0 },
  { label: '≥ 3.0', min: 3 },
  { label: '≥ 4.0', min: 4 },
  { label: '≥ 4.5', min: 4.5 },
]

function matches(venue: Venue, query: string): boolean {
  if (!query) return true
  const q = transliterate(query.toLowerCase())
  const candidates = [venue.name, venue.name_hy, venue.name_ru, venue.name_en].filter(Boolean) as string[]
  return candidates.some(name => {
    const lower = name.toLowerCase()
    const translit = transliterate(name)
    return lower.includes(query.toLowerCase()) || translit.includes(q)
  })
}

function VenueActiveToggle({
  venueId,
  isActive,
  venueName,
  toggleActive,
}: {
  venueId: string
  isActive: boolean
  venueName: string
  toggleActive: (id: string, current: boolean) => Promise<{ ok: boolean; error?: string }>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await toggleActive(venueId, isActive)
            if (!result.ok) {
              toast.error(result.error ?? 'Failed to update venue status')
              return
            }
            toast.success(isActive ? `${venueName} deactivated` : `${venueName} activated`)
          } catch {
            toast.error('Failed to update venue status')
          }
        })
      }}
      disabled={pending}
      title={isActive ? 'Deactivate' : 'Activate'}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
        isActive ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          isActive ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}

export function VenuesSearchTable({ venues, toggleActive, isSuperAdmin }: Props) {
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [kind, setKind] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const cuisines = useMemo(() => Array.from(new Set(venues.map(v => v.cuisine))).sort(), [venues])

  const filtered = useMemo(() => venues.filter(v =>
    matches(v, query) &&
    (cuisine === '' || v.cuisine === cuisine) &&
    (kind === '' || v.kind === kind) &&
    (v.rating === null ? minRating === 0 : v.rating >= minRating) &&
    (activeFilter === 'all' || (activeFilter === 'active' ? v.is_active : !v.is_active))
  ), [venues, query, cuisine, kind, minRating, activeFilter])

  const hasFilters = query || cuisine || kind || minRating > 0 || activeFilter !== 'all'

  const selectClass = "px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white text-zinc-700"

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search venues..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white w-52"
        />
        <select value={cuisine} onChange={e => setCuisine(e.target.value)} className={selectClass}>
          <option value="">All cuisines</option>
          {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={kind} onChange={e => setKind(e.target.value)} className={selectClass}>
          <option value="">All kinds</option>
          {KIND_OPTIONS.map(k => <option key={k} value={k} className="capitalize">{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
        </select>
        <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className={selectClass}>
          {RATING_OPTIONS.map(r => <option key={r.min} value={r.min}>{r.label}</option>)}
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as typeof activeFilter)} className={selectClass}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQuery(''); setCuisine(''); setKind(''); setMinRating(0); setActiveFilter('all') }}
            className="px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 mb-3">{filtered.length} of {venues.length} venues</p>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Cuisine</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Area</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Kind</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Rating</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Active</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Menu</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400 text-sm">
                  No venues found
                </td>
              </tr>
            )}
            {filtered.map(venue => (
              <tr
                key={venue.id}
                className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">{venue.name}</td>
                <td className="px-4 py-3 text-zinc-600">{venue.cuisine}</td>
                <td className="px-4 py-3 text-zinc-600">{venue.area}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 capitalize">
                    {venue.kind}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {venue.rating !== null
                    ? <span>⭐ {venue.rating} <span className="text-zinc-400 text-xs">({venue.reviews_count})</span></span>
                    : <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <VenueActiveToggle
                    venueId={venue.id}
                    isActive={venue.is_active}
                    venueName={venue.name_hy ?? venue.name}
                    toggleActive={toggleActive}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/menus/${venue.id}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                  >
                    Menu
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/venues/${venue.id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
