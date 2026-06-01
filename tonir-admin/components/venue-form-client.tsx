'use client'

import { useState } from 'react'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'

type LangFields = {
  name: string
  cuisine: string
  area: string
  description: string
  perk: string
  tags: string
}

export interface VenueFormDefaults {
  id?: string
  name_hy?: string;  name_ru?: string;  name_en?: string
  cuisine_hy?: string; cuisine_ru?: string; cuisine_en?: string
  area_hy?: string;  area_ru?: string;  area_en?: string
  description_hy?: string; description_ru?: string; description_en?: string
  perk_hy?: string;  perk_ru?: string;  perk_en?: string
  tags_hy?: string;  tags_ru?: string;  tags_en?: string
  price?: string; rating?: string; reviews_count?: string; booked_today?: string
  heat?: string; kind?: string; photo_url?: string; dish_url?: string
  distance_km?: string; coord_x?: string; coord_y?: string
  times?: string; is_active?: string
}

export function VenueFormClient({
  action,
  defaults = {},
  isNew = false,
}: {
  action: (fd: FormData) => void
  defaults?: VenueFormDefaults
  isNew?: boolean
}) {
  const [lang, setLang] = useState<Lang>('hy')
  const [lf, setLf] = useState<Record<Lang, LangFields>>({
    hy: { name: defaults.name_hy ?? '', cuisine: defaults.cuisine_hy ?? '', area: defaults.area_hy ?? '', description: defaults.description_hy ?? '', perk: defaults.perk_hy ?? '', tags: defaults.tags_hy ?? '' },
    ru: { name: defaults.name_ru ?? '', cuisine: defaults.cuisine_ru ?? '', area: defaults.area_ru ?? '', description: defaults.description_ru ?? '', perk: defaults.perk_ru ?? '', tags: defaults.tags_ru ?? '' },
    en: { name: defaults.name_en ?? '', cuisine: defaults.cuisine_en ?? '', area: defaults.area_en ?? '', description: defaults.description_en ?? '', perk: defaults.perk_en ?? '', tags: defaults.tags_en ?? '' },
  })
  const [validErr, setValidErr] = useState<string | null>(null)

  function upd(field: keyof LangFields, value: string) {
    setLf(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))
    setValidErr(null)
  }

  const f = lf[lang]

  function handleSubmit(e: React.FormEvent) {
    if (!lf.hy.name.trim()) {
      e.preventDefault()
      setLang('hy')
      setValidErr('Armenian (Հայ) name is required')
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
      {/* Language selector */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
        <span className="text-sm font-medium text-zinc-500">Language:</span>
        <LangTabs lang={lang} onChange={setLang} />
      </div>

      {/* Hidden inputs carry all language values on submit */}
      {LANGS.flatMap(l => [
        <input key={`name_${l}`}        type="hidden" name={`name_${l}`}        value={lf[l].name} />,
        <input key={`cuisine_${l}`}     type="hidden" name={`cuisine_${l}`}     value={lf[l].cuisine} />,
        <input key={`area_${l}`}        type="hidden" name={`area_${l}`}        value={lf[l].area} />,
        <input key={`description_${l}`} type="hidden" name={`description_${l}`} value={lf[l].description} />,
        <input key={`perk_${l}`}        type="hidden" name={`perk_${l}`}        value={lf[l].perk} />,
        <input key={`tags_${l}`}        type="hidden" name={`tags_${l}`}        value={lf[l].tags} />,
      ])}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isNew && <F label="ID (slug)" name="id" required />}

        {/* Translatable – visible input updates state (no name attr, no duplicate submit) */}
        <TF label="Name"    value={f.name}    onChange={v => upd('name', v)} />
        <TF label="Cuisine" value={f.cuisine} onChange={v => upd('cuisine', v)} />
        <TF label="Area"    value={f.area}    onChange={v => upd('area', v)} />

        {/* Non-translatable */}
        <F label="Price (e.g. $$)"   name="price"         required defaultValue={defaults.price} />
        <F label="Rating (0–5)"      name="rating"        required type="number" step="0.1" min="0" max="5" defaultValue={defaults.rating} />
        <F label="Reviews count"     name="reviews_count" type="number" defaultValue={defaults.reviews_count ?? '0'} />
        <F label="Booked today"      name="booked_today"  type="number" defaultValue={defaults.booked_today  ?? '0'} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Heat</label>
          <select name="heat" defaultValue={defaults.heat ?? 'med'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
            <option value="high">high</option>
            <option value="med">med</option>
            <option value="low">low</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Kind</label>
          <select name="kind" defaultValue={defaults.kind ?? 'restaurant'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
            <option value="restaurant">restaurant</option>
            <option value="bar">bar</option>
            <option value="lounge">lounge</option>
            <option value="club">club</option>
          </select>
        </div>

        <F label="Photo URL"     name="photo_url"   type="url"    required defaultValue={defaults.photo_url} />
        <F label="Dish URL"      name="dish_url"    type="url"    required defaultValue={defaults.dish_url} />
        <F label="Distance (km)" name="distance_km"               defaultValue={defaults.distance_km} />
        <F label="Coord X (lat)" name="coord_x" type="number" step="any" defaultValue={defaults.coord_x ?? '40'} />
        <F label="Coord Y (lng)" name="coord_y" type="number" step="any" defaultValue={defaults.coord_y ?? '44'} />

        {/* Translatable: perk */}
        <TF label="Perk" value={f.perk} onChange={v => upd('perk', v)} />

        {/* Translatable: description */}
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={f.description}
            onChange={e => upd('description', e.target.value)}
            rows={3}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm resize-none"
          />
        </div>

        {/* Non-translatable: times */}
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Times (comma-separated, e.g. 12:00, 13:00)</label>
          <input type="text" name="times" required defaultValue={defaults.times ?? ''} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm" />
        </div>

        {/* Translatable: tags */}
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Tags (comma-separated)</label>
          <input type="text" value={f.tags} onChange={e => upd('tags', e.target.value)} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Active</label>
          <select name="is_active" defaultValue={defaults.is_active ?? 'true'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      {validErr && <p className="text-sm text-red-500">{validErr}</p>}

      <div className="pt-2 border-t border-zinc-100">
        <button type="submit" className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          {isNew ? 'Create venue' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function TF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm" />
    </div>
  )
}

function F({ label, name, type = 'text', required, defaultValue, step, min, max }: {
  label: string; name: string; type?: string; required?: boolean
  defaultValue?: string; step?: string; min?: string; max?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue ?? ''} step={step} min={min} max={max} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm" />
    </div>
  )
}
