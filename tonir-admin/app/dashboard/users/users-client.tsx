'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

type User = {
  id: string
  player_id: number | null
  name: string | null
  email: string | null
  phone: string | null
  tier: number | null
  yel_points: number | null
  total_visits: number | null
  created_at: string | null
}

const TIER_LABELS: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
const TIER_COLORS: Record<number, string> = {
  1: 'bg-zinc-100 text-zinc-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-purple-50 text-purple-700',
  4: 'bg-amber-50 text-amber-700',
}

type SortKey = 'created_at' | 'yel_points' | 'total_visits' | 'name'

export default function UsersClient({ users }: { users: User[] }) {
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    let result = users.filter(u => {
      if (tierFilter !== 'all' && u.tier !== tierFilter) return false
      if (!q) return true
      return (
        String(u.player_id ?? '').includes(q) ||
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      )
    })

    result = [...result].sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortKey === 'name') {
        av = (a.name ?? '').toLowerCase()
        bv = (b.name ?? '').toLowerCase()
      } else if (sortKey === 'created_at') {
        av = a.created_at ?? ''
        bv = b.created_at ?? ''
      } else {
        av = a[sortKey] ?? 0
        bv = b[sortKey] ?? 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [users, query, tierFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-zinc-300">↕</span>
    return <span className="ml-1 text-zinc-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
        <span className="text-sm text-zinc-400">{filtered.length} of {users.length}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ID, name, email or phone…"
          className="flex-1 min-w-[240px] px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />

        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <option value="all">All tiers</option>
          {[1, 2, 3, 4].map(t => (
            <option key={t} value={t}>Tier {t} — {TIER_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={`${sortKey}:${sortDir}`}
          onChange={e => {
            const [k, d] = e.target.value.split(':') as [SortKey, 'asc' | 'desc']
            setSortKey(k); setSortDir(d)
          }}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="yel_points:desc">Most points</option>
          <option value="total_visits:desc">Most visits</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
        </select>

        {(query || tierFilter !== 'all') && (
          <button
            onClick={() => { setQuery(''); setTierFilter('all') }}
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg bg-white"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">
                <button onClick={() => toggleSort('name')} className="flex items-center hover:text-zinc-800">
                  Player ID
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500">
                <button onClick={() => toggleSort('name')} className="flex items-center hover:text-zinc-800">
                  Name <SortIcon col="name" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500">Email</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Phone</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tier</th>
              <th className="px-4 py-3 font-medium text-zinc-500">
                <button onClick={() => toggleSort('yel_points')} className="flex items-center hover:text-zinc-800">
                  YEL <SortIcon col="yel_points" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500">
                <button onClick={() => toggleSort('total_visits')} className="flex items-center hover:text-zinc-800">
                  Visits <SortIcon col="total_visits" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500">
                <button onClick={() => toggleSort('created_at')} className="flex items-center hover:text-zinc-800">
                  Joined <SortIcon col="created_at" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  No users match your search.
                </td>
              </tr>
            ) : (
              filtered.map(user => (
                <tr
                  key={user.id}
                  className="relative odd:bg-white even:bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-zinc-400 tabular-nums font-mono text-xs">{user.player_id}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link href={`/dashboard/users/${user.id}`} className="hover:text-zinc-600 after:absolute after:inset-0">
                      {user.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{user.email ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums whitespace-nowrap">{user.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_COLORS[user.tier ?? 1] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {TIER_LABELS[user.tier ?? 1] ?? `Tier ${user.tier}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.yel_points ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.total_visits ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
