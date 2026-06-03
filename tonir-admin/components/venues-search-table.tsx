'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { transliterate } from '@/lib/transliterate'

type Venue = {
  id: string
  name: string
  name_hy: string | null
  name_ru: string | null
  name_en: string | null
  cuisine: string
  area: string
  kind: string
  rating: number
  is_active: boolean
}

type Props = {
  venues: Venue[]
  toggleActive: (id: string, current: boolean) => Promise<void>
  isSuperAdmin: boolean
}

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

export function VenuesSearchTable({ venues, toggleActive, isSuperAdmin }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => venues.filter(v => matches(v, query)), [venues, query])

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search venues..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white"
        />
      </div>

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
                <td className="px-4 py-3 text-zinc-600">⭐ {venue.rating}</td>
                <td className="px-4 py-3">
                  <form action={toggleActive.bind(null, venue.id, venue.is_active)}>
                    <button
                      type="submit"
                      title={venue.is_active ? 'Deactivate' : 'Activate'}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                        venue.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          venue.is_active ? 'translate-x-[18px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/menus/${venue.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Menu →
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/venues/${venue.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Edit →
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
