'use client'

import { useState } from 'react'

export type PrizeFormDefaults = {
  name?: string
  description?: string
  type?: string
  unlock_type?: string
  points_cost?: string
  min_tier_level?: string
  venue_id?: string
  image_url?: string
  stock?: string
  unlimited_stock?: boolean
  sort_order?: string
  is_active?: string
}

type Venue = { id: string; name: string }

type Props = {
  action: (fd: FormData) => void
  defaults?: PrizeFormDefaults
  venues: Venue[]
  tierNames: Record<number, string>
  isNew?: boolean
}

const TYPE_OPTIONS = [
  { value: 'discount',    label: 'Discount',     desc: 'e.g. 10% off at a restaurant' },
  { value: 'free_item',   label: 'Free Item',    desc: 'e.g. free dessert or drink' },
  { value: 'experience',  label: 'Experience',   desc: 'e.g. private dining, VIP table' },
  { value: 'voucher',     label: 'Voucher',      desc: 'e.g. ₽500 off any booking' },
]

const inputCls = 'h-10 px-3 rounded-lg border border-zinc-300 text-sm w-full focus:outline-none focus:ring-2 focus:ring-zinc-300'
const labelCls = 'text-sm font-medium text-zinc-700 block mb-1'

export function PrizeForm({ action, defaults = {}, venues, tierNames, isNew = false }: Props) {
  const [unlockType,    setUnlockType]    = useState(defaults.unlock_type    ?? 'points')
  const [selectedType,  setSelectedType]  = useState(defaults.type           ?? 'discount')
  const [unlimitedStock, setUnlimitedStock] = useState(defaults.unlimited_stock ?? !defaults.stock)

  return (
    <form action={action} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">

      {/* Unlock type toggle */}
      <div>
        <p className={labelCls}>How is this prize unlocked?</p>
        <div className="flex gap-3">
          {[
            { value: 'points', label: '🛒 Yel Market', desc: 'User spends points to redeem' },
            { value: 'tier',   label: '🏆 Tier Perk',  desc: 'Auto-given when reaching a tier' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex-1 flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                unlockType === opt.value
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="unlock_type"
                value={opt.value}
                checked={unlockType === opt.value}
                onChange={() => setUnlockType(opt.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-zinc-900">{opt.label}</span>
              <span className="text-xs text-zinc-500">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Prize type */}
      <div>
        <p className={labelCls}>Prize type</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                selectedType === opt.value
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={selectedType === opt.value}
                onChange={() => setSelectedType(opt.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-zinc-900">{opt.label}</span>
              <span className="text-xs text-zinc-400">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Prize name *</label>
          <input type="text" name="name" required defaultValue={defaults.name} placeholder="e.g. 10% off at Noah's Ark" className={inputCls} />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea
            name="description"
            defaultValue={defaults.description}
            rows={2}
            placeholder="Describe what the user gets, how to use it, expiry, etc."
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        {/* Conditional: points cost OR tier level */}
        {unlockType === 'points' ? (
          <div>
            <label className={labelCls}>Points cost *</label>
            <input type="number" name="points_cost" required min="1" defaultValue={defaults.points_cost ?? '100'} className={inputCls} />
          </div>
        ) : (
          <div>
            <label className={labelCls}>Unlock at tier *</label>
            <select name="min_tier_level" defaultValue={defaults.min_tier_level ?? '2'} className={inputCls + ' bg-white'}>
              {([1, 2, 3, 4] as const).map(l => (
                <option key={l} value={l}>Level {l} — {tierNames[l]}</option>
              ))}
            </select>
          </div>
        )}
        {/* Hidden field for the unused unlock param so server action always has it */}
        {unlockType === 'points'
          ? <input type="hidden" name="min_tier_level" value="" />
          : <input type="hidden" name="points_cost" value="" />
        }

        {/* Venue */}
        <div>
          <label className={labelCls}>Valid at venue</label>
          <select name="venue_id" defaultValue={defaults.venue_id ?? ''} className={inputCls + ' bg-white'}>
            <option value="">All venues</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Image URL */}
        <div>
          <label className={labelCls}>Image URL</label>
          <input type="url" name="image_url" defaultValue={defaults.image_url} placeholder="https://…" className={inputCls} />
        </div>

        {/* Stock */}
        <div>
          <label className={labelCls}>Stock</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="stock"
              min="1"
              disabled={unlimitedStock}
              defaultValue={defaults.stock}
              placeholder="e.g. 50"
              className={inputCls + (unlimitedStock ? ' opacity-40 cursor-not-allowed' : '')}
            />
            <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                name="unlimited_stock"
                checked={unlimitedStock}
                onChange={e => setUnlimitedStock(e.target.checked)}
                className="accent-zinc-900"
              />
              <span className="text-sm text-zinc-600">Unlimited</span>
            </label>
          </div>
        </div>

        {/* Sort order */}
        <div>
          <label className={labelCls}>Sort order</label>
          <input type="number" name="sort_order" defaultValue={defaults.sort_order ?? '0'} className={inputCls} />
        </div>

        {/* Active */}
        <div>
          <label className={labelCls}>Status</label>
          <select name="is_active" defaultValue={defaults.is_active ?? 'true'} className={inputCls + ' bg-white'}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100">
        <button type="submit" className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          {isNew ? 'Create prize' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
