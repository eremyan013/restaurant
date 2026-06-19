'use client'

import { useState } from 'react'
import { useToast } from '@/components/toast-provider'

const TIER_COLORS: Record<number, string> = {
  1: 'bg-zinc-100 text-zinc-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-violet-50 text-violet-700',
  4: 'bg-amber-50 text-amber-700',
}

const TIER_THRESHOLDS: Record<number, string> = {
  1: '0 – 999 pts',
  2: '1 000 – 1 999 pts',
  3: '2 000 – 2 999 pts',
  4: '3 000+ pts',
}

type Props = {
  tierNames: Record<number, string>
  saveTierNames: (fd: FormData) => Promise<void>
}

export function TierNamesForm({ tierNames, saveTierNames }: Props) {
  const [names, setNames] = useState({ ...tierNames })
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const toast = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setSaved(false)
    const fd = new FormData()
    for (const [level, name] of Object.entries(names)) {
      fd.set(`tier_${level}_name`, name)
    }
    try {
      await saveTierNames(fd)
      setSaved(true)
      toast.success('Tier names saved')
    } catch {
      toast.error('Failed to save tier names')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Tier Names</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Changes apply immediately to all users and the mobile app.
          </p>
        </div>
        {saved && (
          <span className="text-xs text-green-600 font-medium">Saved</span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map(level => (
            <div key={level} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[level]}`}>
                  Level {level}
                </span>
              </div>
              <input
                type="text"
                value={names[level]}
                onChange={e => { setNames(prev => ({ ...prev, [level]: e.target.value })); setSaved(false) }}
                placeholder={`Level ${level} name`}
                className="h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
              <p className="text-xs text-zinc-400">{TIER_THRESHOLDS[level]}</p>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-400">Preview:</span>
          {([1, 2, 3, 4] as const).map(level => (
            <span key={level} className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIER_COLORS[level]}`}>
              {names[level] || `Level ${level}`}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100">
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            {pending ? 'Saving…' : 'Save tier names'}
          </button>
        </div>
      </form>
    </div>
  )
}
