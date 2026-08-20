'use client'

import { useState, useTransition } from 'react'

export type TierPerkRow = {
  id: string
  tier_level: 1 | 2 | 3 | 4
  label_hy: string
  label_ru: string
  label_en: string
  icon_name: string | null
  sort_order: number
  created_at: string
}

type LocalPerk = {
  id: string | null
  label_hy: string
  label_ru: string
  label_en: string
  icon_name: string
}

type Props = {
  initialPerks: TierPerkRow[]
  tierNames: Record<number, string>
  saveTierPerks: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
}

const LEVELS = [1, 2, 3, 4] as const

export function TierPerksSection({ initialPerks, tierNames, saveTierPerks }: Props) {
  const [state, setState] = useState<Record<number, LocalPerk[]>>(() =>
    Object.fromEntries(
      LEVELS.map(level => [
        level,
        initialPerks
          .filter(p => p.tier_level === level)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(p => ({ id: p.id, label_hy: p.label_hy, label_ru: p.label_ru, label_en: p.label_en, icon_name: p.icon_name ?? '' })),
      ])
    )
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function addPerk(level: number) {
    setState(s => ({ ...s, [level]: [...s[level], { id: null, label_hy: '', label_ru: '', label_en: '', icon_name: '' }] }))
  }

  function removePerk(level: number, idx: number) {
    setState(s => ({ ...s, [level]: s[level].filter((_, i) => i !== idx) }))
  }

  function movePerk(level: number, idx: number, dir: -1 | 1) {
    setState(s => {
      const arr = [...s[level]]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return s
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...s, [level]: arr }
    })
  }

  function updatePerk(level: number, idx: number, field: keyof LocalPerk, value: string) {
    setState(s => {
      const arr = s[level].map((p, i) => i === idx ? { ...p, [field]: value } : p)
      return { ...s, [level]: arr }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    LEVELS.forEach(level => {
      state[level].forEach((perk, i) => {
        fd.set(`perks_${level}_${i}_label_hy`,  perk.label_hy)
        fd.set(`perks_${level}_${i}_label_ru`,  perk.label_ru)
        fd.set(`perks_${level}_${i}_label_en`,  perk.label_en)
        fd.set(`perks_${level}_${i}_icon_name`, perk.icon_name)
      })
    })
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveTierPerks(fd)
      if (res.ok) setSaved(true)
      else setError(res.error ?? 'Failed to save')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tier Perks</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? 'Saving…' : 'Save perks'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEVELS.map(level => (
          <div key={level} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {tierNames[level] ?? `Tier ${level}`}
              </span>
            </div>

            {state[level].length === 0 && (
              <p className="text-sm text-gray-400 italic">No perks defined</p>
            )}

            {state[level].map((perk, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => movePerk(level, idx, -1)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      onClick={() => movePerk(level, idx, 1)}
                      disabled={idx === state[level].length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                    >
                      &#9660;
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    <input
                      placeholder="Armenian"
                      value={perk.label_hy}
                      onChange={e => updatePerk(level, idx, 'label_hy', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      placeholder="Russian"
                      value={perk.label_ru}
                      onChange={e => updatePerk(level, idx, 'label_ru', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      placeholder="English"
                      value={perk.label_en}
                      onChange={e => updatePerk(level, idx, 'label_en', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <input
                    placeholder="icon"
                    value={perk.icon_name}
                    onChange={e => updatePerk(level, idx, 'icon_name', e.target.value)}
                    className="w-16 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => removePerk(level, idx)}
                    className="text-red-400 hover:text-red-600 text-sm font-bold"
                    aria-label="Remove perk"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addPerk(level)}
              className="w-full text-xs text-amber-700 hover:text-amber-900 border border-dashed border-amber-300 hover:border-amber-500 rounded-lg py-1.5 transition-colors"
            >
              + Add perk
            </button>
          </div>
        ))}
      </div>
    </form>
  )
}
