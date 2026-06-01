'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { GuideRow } from '@/lib/database.types'

type Venue = { id: string; name: string }

interface GuideFormProps {
  mode: 'create' | 'edit'
  guide?: GuideRow
  venues: Venue[]
  onCancel: () => void
}

export function GuideForm({ mode, guide, venues, onCancel }: GuideFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle]         = useState(guide?.title ?? '')
  const [subtitle, setSubtitle]   = useState(guide?.subtitle ?? '')
  const [tag, setTag]             = useState(guide?.tag ?? '')
  const [sortOrder, setSortOrder] = useState(String(guide?.sort_order ?? 0))
  const [isActive, setIsActive]   = useState(guide?.is_active ?? true)
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(
    new Set(guide?.venue_ids ?? [])
  )

  const [coverPreview, setCoverPreview] = useState<string | null>(guide?.cover_url ?? null)
  const [coverFile, setCoverFile]       = useState<File | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  function toggleVenue(id: string) {
    setSelectedVenues(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError(null)

    try {
      let cover_url = coverPreview && !coverFile ? coverPreview : ''
      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        const res = await fetch('/api/upload-guide-cover', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Cover upload failed')
        cover_url = json.url
      }

      const payload = {
        title:      title.trim(),
        subtitle:   subtitle.trim(),
        tag:        tag.trim(),
        cover_url,
        sort_order: parseInt(sortOrder) || 0,
        venue_ids:  Array.from(selectedVenues),
        is_active:  isActive,
      }

      const url    = mode === 'create' ? '/api/guides' : `/api/guides/${guide!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save')
      }

      router.refresh()
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4"
    >
      <p className="text-sm font-semibold text-zinc-900">
        {mode === 'create' ? 'New guide' : `Edit — ${guide?.title}`}
      </p>

      {/* Cover image */}
      <div className="flex items-start gap-4">
        <div
          className="w-20 h-14 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0 border border-zinc-200 cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
              + Cover
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 transition-colors"
          >
            {coverPreview ? 'Change cover' : 'Upload cover'}
          </button>
          {coverPreview && (
            <button
              type="button"
              onClick={() => { setCoverFile(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors text-left"
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Text fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Best Wine Bars"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Subtitle</label>
          <input
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="Short description"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Tag</label>
          <input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="e.g. Wine"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Sort order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200"
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsActive(v => !v)}
          className={`relative w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
        >
          <span className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
        </button>
        <span className="text-xs text-zinc-500">{isActive ? 'Active' : 'Hidden'}</span>
      </div>

      {/* Venue checkboxes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-500">Venues ({selectedVenues.size} selected)</label>
        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
          {venues.map(v => (
            <label key={v.id} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer hover:text-zinc-900">
              <input
                type="checkbox"
                checked={selectedVenues.has(v.id)}
                onChange={() => toggleVenue(v.id)}
                className="rounded border-zinc-300"
              />
              {v.name}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create guide' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
