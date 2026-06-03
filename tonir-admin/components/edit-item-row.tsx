'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { MenuItemRow } from '@/lib/database.types'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'

type LangItemFields = { name: string; description: string; allergens: string }

export function EditItemRow({ item, venueId, index = 0 }: { item: MenuItemRow; venueId: string; index?: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(item.is_available)
  const [isPopular, setIsPopular] = useState(item.is_popular)
  const [preview, setPreview] = useState<string | null>(item.photo_url)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [lang, setLang] = useState<Lang>('hy')
  const [lf, setLf] = useState<Record<Lang, LangItemFields>>({
    hy: { name: (item as any).name_hy ?? item.name, description: (item as any).description_hy ?? item.description ?? '', allergens: ((item as any).allergens_hy ?? item.allergens ?? []).join(', ') },
    ru: { name: (item as any).name_ru ?? '', description: (item as any).description_ru ?? '', allergens: ((item as any).allergens_ru ?? []).join(', ') },
    en: { name: (item as any).name_en ?? '', description: (item as any).description_en ?? '', allergens: ((item as any).allergens_en ?? []).join(', ') },
  })

  function updLf(field: keyof LangItemFields, value: string) {
    setLf(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))
  }

  const splitArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

  async function toggle(field: 'is_available' | 'is_popular') {
    const newVal = field === 'is_available' ? !isAvailable : !isPopular
    if (field === 'is_available') setIsAvailable(newVal)
    else setIsPopular(newVal)

    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newVal, venue_id: venueId }),
    })
    if (!res.ok) {
      if (field === 'is_available') setIsAvailable(!newVal)
      else setIsPopular(!newVal)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"?`)) return
    await fetch(`/api/menu-items/${item.id}?venueId=${venueId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    try {
      let photo_url: string | null = preview && !photoFile ? preview : null
      if (photoFile) {
        const uploadFd = new FormData()
        uploadFd.append('file', photoFile)
        uploadFd.append('venueId', venueId)
        const res = await fetch('/api/upload-menu-image', { method: 'POST', body: uploadFd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Upload failed')
        photo_url = json.url
        setPreview(photo_url)
      }

      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id:       venueId,
          name:           lf.hy.name || lf.ru.name || lf.en.name,
          name_hy:        lf.hy.name        || null,
          name_ru:        lf.ru.name        || null,
          name_en:        lf.en.name        || null,
          description:    lf.hy.description || lf.ru.description || lf.en.description || null,
          description_hy: lf.hy.description || null,
          description_ru: lf.ru.description || null,
          description_en: lf.en.description || null,
          allergens:      splitArr(lf.hy.allergens),
          allergens_hy:   splitArr(lf.hy.allergens).length ? splitArr(lf.hy.allergens) : null,
          allergens_ru:   splitArr(lf.ru.allergens).length ? splitArr(lf.ru.allergens) : null,
          allergens_en:   splitArr(lf.en.allergens).length ? splitArr(lf.en.allergens) : null,
          price:          parseInt(fd.get('price') as string) || 0,
          photo_url,
          sort_order:     parseInt(fd.get('sort_order') as string) || 0,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save')
      }

      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const avBg  = isAvailable ? 'bg-green-500' : 'bg-red-500'
  const popBg = isPopular   ? 'bg-amber-400' : 'bg-zinc-300'
  const f     = lf[lang]

  return (
    <>
      <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200 transition-colors`}>
        <td className="px-4 py-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-zinc-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-100" />
          )}
        </td>
        <td className="px-4 py-2">
          <p className="font-medium text-zinc-900">{(item as any).name_hy ?? item.name}</p>
          {((item as any).description_hy ?? item.description) && (
            <p className="text-xs text-zinc-400 truncate max-w-[200px]">{(item as any).description_hy ?? item.description}</p>
          )}
        </td>
        <td className="px-4 py-2 text-zinc-600 tabular-nums">{item.price.toLocaleString()} ֏</td>
        <td className="px-4 py-2">
          <button onClick={() => toggle('is_available')}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${avBg}`}>
            <span className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAvailable ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
        </td>
        <td className="px-4 py-2">
          <button onClick={() => toggle('is_popular')}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${popBg}`}>
            <span className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPopular ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditing(v => !v); setError(null) }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600 transition-colors">✕</button>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-zinc-100 bg-zinc-50/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-2">
              <LangTabs lang={lang} onChange={setLang} />
              <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
                {/* Translatable fields */}
                <input type="text" value={f.name} onChange={e => updLf('name', e.target.value)} placeholder="Name*"
                  className="h-8 px-2 rounded border border-zinc-300 text-xs w-36" />
                <input type="text" value={f.description} onChange={e => updLf('description', e.target.value)} placeholder="Description"
                  className="h-8 px-2 rounded border border-zinc-300 text-xs w-44" />
                <input type="text" value={f.allergens} onChange={e => updLf('allergens', e.target.value)} placeholder="Allergens"
                  className="h-8 px-2 rounded border border-zinc-300 text-xs w-32" />

                {/* Non-translatable */}
                <input type="number" name="price" defaultValue={item.price} required min="0" placeholder="Price*"
                  className="h-8 px-2 rounded border border-zinc-300 text-xs w-28" />
                <input type="number" name="sort_order" defaultValue={item.sort_order} placeholder="Order"
                  className="h-8 px-2 rounded border border-zinc-300 text-xs w-16" />

                {/* Photo picker */}
                <div className="flex items-center gap-1.5">
                  {preview && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="preview" className="w-8 h-8 rounded object-cover border border-zinc-200" />
                      <button type="button"
                        onClick={() => { setPhotoFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-700 text-white text-[8px] flex items-center justify-center leading-none">
                        ✕
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="h-8 px-2 rounded border border-zinc-300 text-xs bg-white hover:bg-zinc-50 transition-colors whitespace-nowrap">
                    {preview ? 'Change photo' : '+ Photo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); setPreview(URL.createObjectURL(f)) }}
                    className="hidden" />
                </div>

                <button type="submit" disabled={loading}
                  className="h-8 px-3 rounded bg-zinc-900 text-white text-xs hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setError(null) }}
                  className="h-8 px-3 rounded border border-zinc-300 text-xs hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
              </form>
            </div>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}
