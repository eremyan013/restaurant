'use client'

import { useState, useMemo } from 'react'

type User = {
  id: string
  player_id: number
  name: string
  email: string
  yel_points: number
  tier: string
  tier_level: number
}

type Props = {
  users: User[]
  adjustPoints: (fd: FormData) => Promise<void>
}

export function YelAdjustForm({ users, adjustPoints }: Props) {
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [amount, setAmount]     = useState('')
  const [open, setOpen]         = useState(false)
  const [pending, setPending]   = useState(false)
  const [success, setSuccess]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return []
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.player_id).includes(q)
    ).slice(0, 8)
  }, [users, query])

  function selectUser(u: User) {
    setSelected(u)
    setQuery(u.name)
    setOpen(false)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !amount || isNaN(parseInt(amount))) return
    setPending(true)
    setSuccess(null)
    const fd = new FormData()
    fd.set('user_id', selected.id)
    fd.set('amount',  amount)
    await adjustPoints(fd)
    const pts = parseInt(amount)
    setSuccess(`${pts > 0 ? '+' : ''}${pts} points applied to ${selected.name}`)
    setAmount('')
    setSelected(null)
    setQuery('')
    setPending(false)
  }

  const preview = selected && amount && !isNaN(parseInt(amount))
    ? Math.max(0, selected.yel_points + parseInt(amount))
    : null

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h2 className="text-sm font-medium text-zinc-900 mb-1">Manual Point Adjustment</h2>
      <p className="text-xs text-zinc-400 mb-4">Add or subtract Yel points from any user. Use a negative number to subtract.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User search */}
        <div className="relative">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1">Search user</label>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); setSuccess(null) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Name, email or player ID…"
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            autoComplete="off"
          />
          {open && filtered.length > 0 && (
            <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
              {filtered.map(u => (
                <li key={u.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectUser(u)}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-zinc-900">{u.name}</p>
                    <p className="text-xs text-zinc-400">ID {u.player_id} · {u.yel_points.toLocaleString()} pts · {u.tier}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected user info */}
        {selected && (
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">{selected.name}</p>
              <p className="text-xs text-zinc-500">ID {selected.player_id} · {selected.email}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-zinc-900 tabular-nums">{selected.yel_points.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">current points</p>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1">Amount</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            {/* Quick preset buttons */}
            <div className="flex gap-1">
              {[50, 100, 250, 500].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAmount(String(n))}
                  className="h-10 px-2.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {preview !== null && selected && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              New balance for <span className="font-medium">{selected.name}</span>
            </p>
            <p className="text-lg font-semibold text-amber-700 tabular-nums">{preview.toLocaleString()} pts</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-2.5">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!selected || !amount || pending}
          className="w-full py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Applying…' : 'Apply adjustment'}
        </button>
      </form>
    </div>
  )
}
