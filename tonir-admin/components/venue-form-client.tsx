'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'
import { useToast } from '@/components/toast-provider'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function ImageField({
  label, name, defaultValue,
}: { label: string; name: string; defaultValue?: string }) {
  const [url, setUrl]         = useState(defaultValue ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)
  const toast                 = useToast()

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload-venue-photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setUrl(json.url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }, [toast])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input type="hidden" name={name} value={url} />

      {/* Preview */}
      {url && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setUrl('')}
            aria-label={`Remove ${label} image`}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="h-10 px-3 rounded-lg border border-zinc-300 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Predefined cuisine list ────────────────────────────────────────────────────
// Update hy / ru translations to match your app's copy as needed.
const CUISINES: Array<{ id: string; hy: string; ru: string; en: string }> = [
  { id: 'armenian',      hy: 'Հայկական',        ru: 'Армянская',          en: 'Armenian' },
  { id: 'georgian',      hy: 'Վրացական',         ru: 'Грузинская',         en: 'Georgian' },
  { id: 'russian',       hy: 'Ռուսական',         ru: 'Русская',            en: 'Russian' },
  { id: 'european',      hy: 'Եվրոպական',        ru: 'Европейская',        en: 'European' },
  { id: 'mediterranean', hy: 'Միջերկրածովյան',  ru: 'Средиземноморская',  en: 'Mediterranean' },
  { id: 'italian',       hy: 'Իտալական',         ru: 'Итальянская',        en: 'Italian' },
  { id: 'french',        hy: 'Ֆրանսիական',       ru: 'Французская',        en: 'French' },
  { id: 'japanese',      hy: 'Ճապոնական',        ru: 'Японская',           en: 'Japanese' },
  { id: 'chinese',       hy: 'Չինական',          ru: 'Китайская',          en: 'Chinese' },
  { id: 'turkish',       hy: 'Թուրքական',        ru: 'Турецкая',           en: 'Turkish' },
  { id: 'lebanese',      hy: 'Լիբանանյան',       ru: 'Ливанская',          en: 'Lebanese' },
  { id: 'american',      hy: 'Ամերիկյան',        ru: 'Американская',       en: 'American' },
  { id: 'mexican',       hy: 'Մեքսիկական',       ru: 'Мексиканская',       en: 'Mexican' },
  { id: 'indian',        hy: 'Հնդկական',         ru: 'Индийская',          en: 'Indian' },
  { id: 'bbq',           hy: 'BBQ',              ru: 'Барбекю',            en: 'BBQ / Grill' },
  { id: 'seafood',       hy: 'Ծովամթերք',        ru: 'Морепродукты',       en: 'Seafood' },
  { id: 'vegetarian',    hy: 'Բուսակերական',     ru: 'Вегетарианская',     en: 'Vegetarian' },
  { id: 'vegan',         hy: 'Վեգան',            ru: 'Веганская',          en: 'Vegan' },
  { id: 'fusion',        hy: 'Ֆյուժն',           ru: 'Фьюжн',             en: 'Fusion' },
  { id: 'pizza',         hy: 'Պիցցա',            ru: 'Пицца',             en: 'Pizza' },
  { id: 'sushi',         hy: 'Սուշի',            ru: 'Суши',              en: 'Sushi' },
  { id: 'burger',        hy: 'Բուրգեր',           ru: 'Бургеры',           en: 'Burger' },
  { id: 'cafe',          hy: 'Կաֆե',             ru: 'Кафе',              en: 'Cafe' },
  { id: 'bar',           hy: 'Բար',              ru: 'Барная',            en: 'Bar' },
]

function initSelectedCuisines(defaults: VenueFormDefaults): string[] {
  // Try matching by English name first (most reliable)
  const enStr = defaults.cuisine_en ?? ''
  if (enStr) {
    const matched = enStr.split(',').map(s => s.trim())
      .map(name => CUISINES.find(c => c.en.toLowerCase() === name.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id))
    if (matched.length > 0) return matched
  }
  // Fall back to Armenian name matching
  const hyStr = defaults.cuisine_hy ?? ''
  if (hyStr) {
    const matched = hyStr.split(',').map(s => s.trim())
      .map(name => CUISINES.find(c => c.hy === name)?.id)
      .filter((id): id is string => Boolean(id))
    if (matched.length > 0) return matched
  }
  return []
}

type LangFields = {
  name: string
  area: string
  description: string
  perk: string
  tags: string
}

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    country?: string
  }
}

export interface VenueFormDefaults {
  id?: string
  name_hy?: string;  name_ru?: string;  name_en?: string
  cuisine_hy?: string; cuisine_ru?: string; cuisine_en?: string
  area_hy?: string;  area_ru?: string;  area_en?: string
  description_hy?: string; description_ru?: string; description_en?: string
  perk_hy?: string;  perk_ru?: string;  perk_en?: string
  tags_hy?: string;  tags_ru?: string;  tags_en?: string
  price?: string
  heat?: string; kind?: string; photo_url?: string; dish_url?: string
  distance_km?: string; coord_x?: string; coord_y?: string
  times?: string; time_yel_map?: string; is_active?: string
  location_id?: string | null
}

// ── Time slot types & helpers ──────────────────────────────────────────────────

type TimeSlot = { time: string; yel: number }

function parseDefaultSlots(defaults: VenueFormDefaults): TimeSlot[] {
  const times = (defaults.times ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const map: Record<string, number> = defaults.time_yel_map
    ? (() => { try { return JSON.parse(defaults.time_yel_map) } catch { return {} } })()
    : {}
  return times.map(t => ({ time: t, yel: map[t] ?? 0 }))
}

interface TimeYelEditorProps {
  defaultSlots?: TimeSlot[]
  onChange?: () => void
}

type SortableSlotRowProps = {
  id: string
  slot: TimeSlot
  index: number
  onTimeChange: (i: number, v: string) => void
  onYelChange: (i: number, v: string) => void
  onRemove: (i: number) => void
}

function SortableSlotRow({ id, slot, index, onTimeChange, onYelChange, onRemove }: SortableSlotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 px-1 touch-none"
      >
        ⠿
      </button>
      <input
        type="text"
        value={slot.time}
        onChange={e => onTimeChange(index, e.target.value)}
        placeholder="HH:MM"
        aria-label={`Time slot ${index + 1}`}
        className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-28"
      />
      <span className="text-sm text-zinc-500 shrink-0">YEL pts:</span>
      <input
        type="number"
        min={0}
        value={slot.yel}
        onChange={e => onYelChange(index, e.target.value)}
        aria-label={`YEL points for slot ${index + 1}`}
        className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-24"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Remove time slot ${index + 1}`}
        className="h-10 px-3 rounded-lg border border-zinc-300 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-red-600 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}

function TimeYelEditor({ defaultSlots, onChange }: TimeYelEditorProps) {
  const [slots, setSlots] = useState<(TimeSlot & { id: string })[]>(
    () => (defaultSlots ?? []).map((s, i) => ({ ...s, id: `slot-${i}-${s.time}` }))
  )

  const sensors = useSensors(useSensor(PointerSensor))

  function mutate(next: (TimeSlot & { id: string })[]) {
    setSlots(next)
    onChange?.()
  }

  function addSlot() {
    const id = `slot-new-${Date.now()}`
    mutate([...slots, { time: '', yel: 0, id }])
  }

  function removeSlot(index: number) {
    mutate(slots.filter((_, i) => i !== index))
  }

  function updateTime(index: number, value: string) {
    mutate(slots.map((s, i) => i === index ? { ...s, time: value } : s))
  }

  function updateYel(index: number, value: string) {
    mutate(slots.map((s, i) => i === index ? { ...s, yel: Math.max(0, parseInt(value, 10) || 0) } : s))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = slots.findIndex(s => s.id === active.id)
      const newIndex = slots.findIndex(s => s.id === over.id)
      mutate(arrayMove(slots, oldIndex, newIndex))
    }
  }

  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700">Time slots &amp; YEL points</label>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="times" value={slots.map(s => s.time).join(',')} />
      <input
        type="hidden"
        name="time_yel_map"
        value={JSON.stringify(
          Object.fromEntries(
            slots.filter(s => s.time).map(s => [s.time, s.yel])
          )
        )}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {slots.map((slot, i) => (
              <SortableSlotRow
                key={slot.id}
                id={slot.id}
                slot={slot}
                index={i}
                onTimeChange={updateTime}
                onYelChange={updateYel}
                onRemove={removeSlot}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addSlot}
        className="self-start h-10 px-3 rounded-lg border border-zinc-300 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
      >
        + Add time slot
      </button>
    </div>
  )
}

export function VenueFormClient({
  action,
  defaults = {},
  isNew = false,
  bookedToday,
  locations = [],
}: {
  action: (fd: FormData) => void
  defaults?: VenueFormDefaults
  isNew?: boolean
  bookedToday?: number
  locations?: { id: string; name_en: string }[]
}) {
  const [lang, setLang] = useState<Lang>('hy')
  const [lf, setLf] = useState<Record<Lang, LangFields>>({
    hy: { name: defaults.name_hy ?? '', area: defaults.area_hy ?? '', description: defaults.description_hy ?? '', perk: defaults.perk_hy ?? '', tags: defaults.tags_hy ?? '' },
    ru: { name: defaults.name_ru ?? '', area: defaults.area_ru ?? '', description: defaults.description_ru ?? '', perk: defaults.perk_ru ?? '', tags: defaults.tags_ru ?? '' },
    en: { name: defaults.name_en ?? '', area: defaults.area_en ?? '', description: defaults.description_en ?? '', perk: defaults.perk_en ?? '', tags: defaults.tags_en ?? '' },
  })
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(() => initSelectedCuisines(defaults))
  const [coordX, setCoordX] = useState(defaults.coord_x ?? '44')
  const [coordY, setCoordY] = useState(defaults.coord_y ?? '40')
  const [validErr, setValidErr] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Computed cuisine strings per language from selected IDs
  const cuisineHy = selectedCuisines.map(id => CUISINES.find(c => c.id === id)?.hy ?? id).join(', ')
  const cuisineRu = selectedCuisines.map(id => CUISINES.find(c => c.id === id)?.ru ?? id).join(', ')
  const cuisineEn = selectedCuisines.map(id => CUISINES.find(c => c.id === id)?.en ?? id).join(', ')

  function upd(field: keyof LangFields, value: string) {
    setLf(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))
    setValidErr(null)
    setIsDirty(true)
  }

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  function onAddressSelect(result: NominatimResult) {
    const shortName = [
      result.address.road,
      result.address.suburb ?? result.address.neighbourhood ?? result.address.city ?? result.address.town,
    ].filter(Boolean).join(', ') || result.display_name

    upd('area', shortName)
    setCoordX(parseFloat(result.lon).toFixed(6))
    setCoordY(parseFloat(result.lat).toFixed(6))
  }

  const f = lf[lang]

  function handleSubmit(e: React.FormEvent) {
    if (!lf.hy.name.trim()) {
      e.preventDefault()
      setLang('hy')
      setValidErr('Armenian (Հայ) name is required')
      return
    }
    const timesHidden = (e.currentTarget as HTMLFormElement).elements.namedItem('times') as HTMLInputElement
    if (!timesHidden?.value.trim()) {
      e.preventDefault()
      setValidErr('At least one time slot is required')
      return
    }
    // Validate HH:MM format
    const timeValues = timesHidden.value.split(',').map(s => s.trim())
    const badTime = timeValues.find(t => !/^\d{2}:\d{2}$/.test(t))
    if (badTime) {
      e.preventDefault()
      setValidErr(`Invalid time format "${badTime}" — use HH:MM`)
      return
    }
    const hasDupes = new Set(timeValues).size !== timeValues.length
    if (hasDupes) {
      e.preventDefault()
      setValidErr('Duplicate time slots are not allowed')
      return
    }
    setIsDirty(false)
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
        <input key={`area_${l}`}        type="hidden" name={`area_${l}`}        value={lf[l].area} />,
        <input key={`description_${l}`} type="hidden" name={`description_${l}`} value={lf[l].description} />,
        <input key={`perk_${l}`}        type="hidden" name={`perk_${l}`}        value={lf[l].perk} />,
        <input key={`tags_${l}`}        type="hidden" name={`tags_${l}`}        value={lf[l].tags} />,
      ])}
      {/* Cuisine hidden inputs — computed from selected cuisine IDs */}
      <input type="hidden" name="cuisine_hy" value={cuisineHy} />
      <input type="hidden" name="cuisine_ru" value={cuisineRu} />
      <input type="hidden" name="cuisine_en" value={cuisineEn} />
      <input type="hidden" name="coord_x" value={coordX} />
      <input type="hidden" name="coord_y" value={coordY} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isNew && <F label="ID (slug)" name="id" required />}

        {/* Translatable name */}
        <TF label="Name" value={f.name} onChange={v => upd('name', v)} />

        {/* Cuisine multi-select — spans full width */}
        <div className="sm:col-span-2">
          <CuisineSelect selected={selectedCuisines} onChange={(ids) => { setSelectedCuisines(ids); setIsDirty(true) }} />
        </div>

        {/* Address field with autocomplete — spans full width */}
        <div className="sm:col-span-2">
          <AddressField
            value={f.area}
            onChange={v => upd('area', v)}
            onSelect={onAddressSelect}
            coordX={coordX}
            coordY={coordY}
            onCoordXChange={(v) => { setCoordX(v); setIsDirty(true) }}
            onCoordYChange={(v) => { setCoordY(v); setIsDirty(true) }}
          />
        </div>

        {/* Non-translatable */}
        <F label="Price (e.g. $$)"   name="price"         required defaultValue={defaults.price} />
        {bookedToday !== undefined && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">Booked today</label>
            <div className="h-10 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 flex items-center tabular-nums">
              {bookedToday} confirmed
            </div>
          </div>
        )}

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

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Location</label>
          <select name="location_id" defaultValue={defaults.location_id ?? ''} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
            <option value="">— unassigned —</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name_en}</option>
            ))}
          </select>
        </div>

        <ImageField label="Photo"      name="photo_url" defaultValue={defaults.photo_url} />
        <ImageField label="Dish photo" name="dish_url"  defaultValue={defaults.dish_url} />
        <F label="Distance (km)" name="distance_km"               defaultValue={defaults.distance_km} />

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

        {/* Non-translatable: time slots with YEL points */}
        <TimeYelEditor
          defaultSlots={parseDefaultSlots(defaults)}
          onChange={() => { setValidErr(null); setIsDirty(true) }}
        />

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
        {isDirty && (
          <p className="text-xs text-amber-600 mb-2">You have unsaved changes.</p>
        )}
        <button type="submit" className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
          {isNew ? 'Create venue' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function CuisineSelect({ selected, onChange }: {
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const triggerLabel = selected.length === 0
    ? 'Select cuisines…'
    : selected.map(id => CUISINES.find(c => c.id === id)?.en).filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">Cuisine</label>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            Clear all
          </button>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white text-left flex items-center justify-between gap-2 hover:border-zinc-400 transition-colors"
        >
          <span className={`truncate ${selected.length === 0 ? 'text-zinc-400' : 'text-zinc-700'}`}>
            {triggerLabel}
          </span>
          <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {CUISINES.map(c => {
              const checked = selected.includes(c.id)
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                  />
                  <span className="text-sm text-zinc-700">{c.en}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AddressField({
  value, onChange, onSelect, coordX, coordY, onCoordXChange, onCoordYChange,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (r: NominatimResult) => void
  coordX: string
  coordY: string
  onCoordXChange: (v: string) => void
  onCoordYChange: (v: string) => void
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!v.trim()) { setSuggestions([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=6&addressdetails=1&accept-language=en`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(r: NominatimResult) {
    onSelect(r)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">Address</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Start typing an address…"
          className="h-10 w-full px-3 rounded-lg border border-zinc-300 text-sm pr-8"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">…</span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
            {suggestions.map(r => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                >
                  <span className="font-medium text-zinc-900 block truncate">
                    {[r.address.road, r.address.suburb ?? r.address.neighbourhood].filter(Boolean).join(', ') || r.display_name.split(',')[0]}
                  </span>
                  <span className="text-xs text-zinc-400 truncate block">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Coordinates row — shown below address, auto-filled but manually editable */}
      <div className="flex gap-3 mt-1">
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-xs text-zinc-400">Longitude (auto-filled)</label>
          <input type="text" value={coordX} onChange={e => onCoordXChange(e.target.value)} className="h-8 px-2 rounded-md border border-zinc-200 text-xs text-zinc-600 font-mono" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-xs text-zinc-400">Latitude (auto-filled)</label>
          <input type="text" value={coordY} onChange={e => onCoordYChange(e.target.value)} className="h-8 px-2 rounded-md border border-zinc-200 text-xs text-zinc-600 font-mono" />
        </div>
      </div>
    </div>
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
