'use client'

import { useState } from 'react'
import { useToast } from '@/components/toast-provider'

const TIER_COLORS: Record<number, string> = {
  1: 'bg-zinc-100 text-zinc-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-violet-50 text-violet-700',
  4: 'bg-amber-50 text-amber-700',
}

type Props = {
  tierNames: Record<number, string>
  tierMins:  Record<number, number>
  saveTierSettings: (fd: FormData) => Promise<void>
}

export function TierSettingsForm({ tierNames, tierMins, saveTierSettings }: Props) {
  const [names, setNames] = useState({ ...tierNames })
  const [mins,  setMins]  = useState({ ...tierMins })
  const [pending, setPending] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const toast = useToast()

  function validate(): string | null {
    if (mins[2] <= 0) return 'Level 2 minimum must be greater than 0'
    if (mins[3] <= mins[2]) return 'Level 3 minimum must be greater than Level 2'
    if (mins[4] <= mins[3]) return 'Level 4 minimum must be greater than Level 3'
    for (const [level, name] of Object.entries(names)) {
      if (!name.trim()) return `Level ${level} name cannot be empty`
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); toast.error(err); return }
    setPending(true)
    setSaved(false)
    setError(null)
    const fd = new FormData()
    for (const [level, name] of Object.entries(names)) fd.set(`tier_${level}_name`, name)
    fd.set('tier_2_min', String(mins[2]))
    fd.set('tier_3_min', String(mins[3]))
    fd.set('tier_4_min', String(mins[4]))
    try {
      await saveTierSettings(fd)
      setSaved(true)
      toast.success('Tier settings saved')
    } catch {
      toast.error('Failed to save tier settings')
    } finally {
      setPending(false)
    }
  }

  function range(level: number) {
    const from = level === 1 ? 0 : mins[level]
    const to   = level < 4 ? mins[level + 1] - 1 : null
    return to !== null
      ? `${from.toLocaleString()} – ${to.toLocaleString()} pts`
      : `${from.toLocaleString()}+ pts`
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Tier Settings</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Changes apply to all users immediately. Level 1 always starts at 0 pts.
          </p>
        </div>
        {saved && <span className="text-xs text-green-600 font-medium">Saved</span>}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map(level => (
            <div key={level} className="flex flex-col gap-2 p-3 rounded-lg border border-zinc-100 bg-zinc-50">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[level]}`}>
                  Level {level}
                </span>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={names[level]}
                  onChange={e => { setNames(p => ({ ...p, [level]: e.target.value })); setSaved(false); setError(null) }}
                  className="w-full h-9 px-2.5 rounded-md border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              {/* Min points — level 1 fixed at 0 */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Min points</label>
                {level === 1 ? (
                  <div className="h-9 px-2.5 rounded-md border border-zinc-200 text-sm bg-zinc-100 flex items-center text-zinc-400">
                    0 (fixed)
                  </div>
                ) : (
                  <input
                    type="number"
                    min={level === 2 ? 1 : mins[level - 1] + 1}
                    value={mins[level]}
                    onChange={e => { setMins(p => ({ ...p, [level]: parseInt(e.target.value) || 0 })); setSaved(false); setError(null) }}
                    className="w-full h-9 px-2.5 rounded-md border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                )}
              </div>

              {/* Live range preview */}
              <p className="text-xs text-zinc-400">{range(level)}</p>
            </div>
          ))}
        </div>

        {/* Live badge preview */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-400">Preview:</span>
          {([1, 2, 3, 4] as const).map(level => (
            <span key={level} className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIER_COLORS[level]}`}>
              {names[level] || `Level ${level}`}
            </span>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-4 pt-4 border-t border-zinc-100">
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            {pending ? 'Saving…' : 'Save tier settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
