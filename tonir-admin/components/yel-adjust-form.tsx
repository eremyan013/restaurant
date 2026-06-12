'use client'

import { useActionState, useState } from 'react'
import { searchUsersAction } from '@/app/dashboard/reservations/actions'

type SearchResult = { id: string; name: string; email: string; player_id: number }
const INIT_SEARCH: { results: SearchResult[] } = { results: [] }

type Props = {
  adjustPoints: (fd: FormData) => Promise<void>
}

export function YelAdjustForm({ adjustPoints }: Props) {
  const [searchState, searchAction, searching] = useActionState(searchUsersAction, INIT_SEARCH)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [amount, setAmount]     = useState('')
  const [pending, setPending]   = useState(false)
  const [success, setSuccess]   = useState<string | null>(null)

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
    setPending(false)
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h2 className="text-sm font-medium text-zinc-900 mb-1">Manual Point Adjustment</h2>
      <p className="text-xs text-zinc-400 mb-4">Add or subtract Yel points from any user. Use a negative number to subtract.</p>

      <div className="space-y-4">
        {/* Search section — sibling to submit form, not nested inside it */}
        {!selected && (
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1">Search user</label>
            <form action={searchAction} className="flex gap-2">
              <input
                name="q"
                type="text"
                placeholder="Name, email or player ID…"
                className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-3 h-10 rounded-lg bg-zinc-900 text-white text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {searching ? '…' : 'Search'}
              </button>
            </form>
            {searchState.results.length > 0 && (
              <ul className="mt-1.5 border border-zinc-200 rounded-lg overflow-hidden">
                {searchState.results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(u)}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-zinc-900">{u.name}</p>
                      <p className="text-xs text-zinc-400">{u.email} · ID {u.player_id}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Selected user card */}
        {selected && (
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1">
              User <span className="text-green-600 normal-case">selected</span>
            </label>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">{selected.name}</p>
                <p className="text-xs text-zinc-500">ID {selected.player_id} · {selected.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Amount + submit — in their own form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
    </div>
  )
}
