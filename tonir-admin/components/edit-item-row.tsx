'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { MenuItemRow } from '@/lib/database.types'

export function EditItemRow({ item, venueId }: { item: MenuItemRow; venueId: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(item.is_available)
  const [isPopular, setIsPopular] = useState(item.is_popular)
  const [preview, setPreview] = useState<string | null>(item.photo_url)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
      // revert on failure
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
          venue_id: venueId,
          name: fd.get('name') as string,
          description: (fd.get('description') as string) || null,
          price: parseInt(fd.get('price') as string) || 0,
          photo_url,
          allergens: (fd.get('allergens') as string).split(',').map(s => s.trim()).filter(Boolean),
          sort_order: parseInt(fd.get('sort_order') as string) || 0,
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

  const avBg   = isAvailable ? 'bg-green-500' : 'bg-zinc-300'
  const popBg  = isPopular   ? 'bg-amber-400' : 'bg-zinc-300'

  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0">
        <td className="px-4 py-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-zinc-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-100" />
          )}
        </td>
        <td className="px-4 py-2">
          <p className="font-medium text-zinc-900">{item.name}</p>
          {item.description && (
            <p className="text-xs text-zinc-400 truncate max-w-[200px]">{item.description}</p>
          )}
        </td>
        <td className="px-4 py-2 text-zinc-600 tabular-nums">{item.price.toLocaleString()} ֏</td>
        <td className="px-4 py-2">
          <button
            onClick={() => toggle('is_available')}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${avBg}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAvailable ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </td>
        <td className="px-4 py-2">
          <button
            onClick={() => toggle('is_popular')}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${popBg}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPopular ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditing(v => !v); setError(null) }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-zinc-100 bg-zinc-50/60">
          <td colSpan={6} className="px-4 py-3">
            <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
              <input
                type="text" name="name" defaultValue={item.name} required placeholder="Name*"
                className="h-8 px-2 rounded border border-zinc-300 text-xs w-36"
              />
              <input
                type="text" name="description" defaultValue={item.description ?? ''} placeholder="Description"
                className="h-8 px-2 rounded border border-zinc-300 text-xs w-44"
              />
              <input
                type="number" name="price" defaultValue={item.price} required min="0" placeholder="Price*"
                className="h-8 px-2 rounded border border-zinc-300 text-xs w-28"
              />
              <input
                type="text" name="allergens" defaultValue={item.allergens.join(', ')} placeholder="Allergens"
                className="h-8 px-2 rounded border border-zinc-300 text-xs w-32"
              />
              <input
                type="number" name="sort_order" defaultValue={item.sort_order} placeholder="Order"
                className="h-8 px-2 rounded border border-zinc-300 text-xs w-16"
              />

              {/* Photo picker */}
              <div className="flex items-center gap-1.5">
                {preview && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="preview" className="w-8 h-8 rounded object-cover border border-zinc-200" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-700 text-white text-[8px] flex items-center justify-center leading-none"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-8 px-2 rounded border border-zinc-300 text-xs bg-white hover:bg-zinc-50 transition-colors whitespace-nowrap"
                >
                  {preview ? 'Change photo' : '+ Photo'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setPhotoFile(f)
                    setPreview(URL.createObjectURL(f))
                  }}
                  className="hidden"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="h-8 px-3 rounded bg-zinc-900 text-white text-xs hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null) }}
                className="h-8 px-3 rounded border border-zinc-300 text-xs hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </form>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}
