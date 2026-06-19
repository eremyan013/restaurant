'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'
import { useToast } from '@/components/toast-provider'

type LangItemFields = { name: string; description: string; allergens: string }

export function AddItemForm({
  venueId,
  categoryId,
}: {
  venueId: string
  categoryId: string
}) {
  const router = useRouter()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lang, setLang] = useState<Lang>('hy')
  const [lf, setLf] = useState<Record<Lang, LangItemFields>>({
    hy: { name: '', description: '', allergens: '' },
    ru: { name: '', description: '', allergens: '' },
    en: { name: '', description: '', allergens: '' },
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updLf(field: keyof LangItemFields, value: string) {
    setLf(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const splitArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!lf.hy.name.trim()) { setError('Armenian name is required'); setLang('hy'); return }
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    try {
      let photo_url: string | null = null
      if (photoFile) {
        const uploadFd = new FormData()
        uploadFd.append('file', photoFile)
        uploadFd.append('venueId', venueId)
        const res = await fetch('/api/upload-menu-image', { method: 'POST', body: uploadFd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Upload failed')
        photo_url = json.url
      }

      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id:       venueId,
          category_id:    categoryId,
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
          is_popular:     fd.get('is_popular') === 'true',
          sort_order:     parseInt(fd.get('sort_order') as string) || 0,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to add item')
      }

      setLf({ hy: { name: '', description: '', allergens: '' }, ru: { name: '', description: '', allergens: '' }, en: { name: '', description: '', allergens: '' } })
      ;(e.target as HTMLFormElement).reset()
      clearPhoto()
      toast.success('Item added')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const f = lf[lang]

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">Add item</p>
      <LangTabs lang={lang} onChange={setLang} />
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        {/* Translatable fields – no name attr, updated via state */}
        <input
          type="text" value={f.name} onChange={e => updLf('name', e.target.value)}
          placeholder="Name*"
          className="h-8 px-2 rounded border border-zinc-300 text-xs w-36"
        />
        <input
          type="text" value={f.description} onChange={e => updLf('description', e.target.value)}
          placeholder="Description"
          className="h-8 px-2 rounded border border-zinc-300 text-xs w-44"
        />
        <input
          type="text" value={f.allergens} onChange={e => updLf('allergens', e.target.value)}
          placeholder="Allergens"
          className="h-8 px-2 rounded border border-zinc-300 text-xs w-32"
        />

        {/* Non-translatable fields – keep name attr */}
        <input type="number" name="price" placeholder="Price (AMD)*" required min="0"
          className="h-8 px-2 rounded border border-zinc-300 text-xs w-28" />
        <input type="number" name="sort_order" placeholder="Order" defaultValue="0"
          className="h-8 px-2 rounded border border-zinc-300 text-xs w-16" />
        <select name="is_popular" className="h-8 px-2 rounded border border-zinc-300 text-xs bg-white">
          <option value="false">Not popular</option>
          <option value="true">Popular</option>
        </select>

        {/* Photo picker */}
        <div className="flex items-center gap-1.5">
          {preview && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-8 h-8 rounded object-cover border border-zinc-200" />
              <button type="button" onClick={clearPhoto}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-700 text-white text-[8px] flex items-center justify-center leading-none">
                ✕
              </button>
            </div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="h-8 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors whitespace-nowrap">
            {preview ? 'Change photo' : '+ Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); setPreview(URL.createObjectURL(f)) }}
            className="hidden" />
        </div>

        <button type="submit" disabled={loading}
          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition-colors">
          {loading ? 'Adding…' : 'Add'}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
