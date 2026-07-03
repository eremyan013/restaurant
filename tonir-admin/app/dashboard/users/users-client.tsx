'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  player_id: number | null
  name: string | null
  email: string | null
  phone: string | null
  tier: string | null
  yel_points: number | null
  total_visits: number | null
  created_at: string | null
}

type Props = {
  users: User[]
  totalCount: number
  currentPage: number
  defaultQ: string
  defaultTier: string
  defaultSort: string
}

const TIER_COLORS: Record<string, string> = {
  '1': 'bg-zinc-100 text-zinc-600',
  '2': 'bg-blue-50 text-blue-700',
  '3': 'bg-purple-50 text-purple-700',
  '4': 'bg-amber-50 text-amber-700',
}
const TIER_LABELS: Record<string, string> = {
  '1': 'Tonir', '2': 'Pandok', '3': 'Areni', '4': 'Master',
}

export default function UsersClient({
  users,
  totalCount,
  defaultQ,
  defaultTier,
  defaultSort,
}: Props) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState(defaultQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInputValue(defaultQ)
  }, [defaultQ])

  const q = defaultQ
  const tier = defaultTier
  const sort = defaultSort || 'created_at:desc'

  function navigate(overrides: { q?: string; tier?: string; sort?: string }) {
    const params = new URLSearchParams()
    const newQ    = overrides.q    !== undefined ? overrides.q    : q
    const newTier = overrides.tier !== undefined ? overrides.tier : tier
    const newSort = overrides.sort !== undefined ? overrides.sort : sort
    if (newQ)    params.set('q', newQ)
    if (newTier) params.set('tier', newTier)
    if (newSort !== 'created_at:desc') params.set('sort', newSort)
    router.push(`/dashboard/users${params.toString() ? '?' + params.toString() : ''}`)
  }

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ q: value })
    }, 200)
  }

  const hasActiveFilters = q !== '' || tier !== ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
        <span className="text-sm text-zinc-400">{totalCount} users</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by ID, name, email or phone…"
          className="flex-1 min-w-[240px] px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />

        <select
          value={tier || 'all'}
          onChange={e => navigate({ tier: e.target.value === 'all' ? '' : e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <option value="all">All tiers</option>
          {['1', '2', '3', '4'].map(t => (
            <option key={t} value={t}>Tier {t} — {TIER_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={e => navigate({ sort: e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="yel_points:desc">Most points</option>
          <option value="total_visits:desc">Most visits</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setInputValue('')
              router.push('/dashboard/users')
            }}
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
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Player ID</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Name</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Email</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Phone</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Tier</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">YEL</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Visits</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  No users match your search.
                </td>
              </tr>
            ) : (
              users.map(user => (
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
                    <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_COLORS[user.tier ?? '1'] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {TIER_LABELS[user.tier ?? '1'] ?? `Tier ${user.tier}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.yel_points ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{user.total_visits ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yerevan' }) : '—'}
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
