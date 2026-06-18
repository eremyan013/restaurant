'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { GuideRow } from '@/lib/database.types'
import { useToast } from '@/components/toast-provider'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'

type Venue = { id: string; name: string }
type LangGuideFields = { title: string; subtitle: string; tag: string }

interface GuideFormProps {
  mode: 'create' | 'edit'
  guide?: GuideRow
  venues: Venue[]
  onCancel: () => void
}

export function GuideForm({ mode, guide, venues, onCancel }: GuideFormProps) {
  const router = useRouter()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [lang, setLang] = useState<Lang>('hy')
  const [lf, setLf] = useState<Record<Lang, LangGuideFields>>({
    hy: { title: (guide as any)?.title_hy ?? guide?.title ?? '', subtitle: (guide as any)?.subtitle_hy ?? guide?.subtitle ?? '', tag: (guide as any)?.tag_hy ?? guide?.tag ?? '' },
    ru: { title: (guide as any)?.title_ru ?? '', subtitle: (guide as any)?.subtitle_ru ?? '', tag: (guide as any)?.tag_ru ?? '' },
    en: { title: (guide as any)?.title_en ?? '', subtitle: (guide as any)?.subtitle_en ?? '', tag: (guide as any)?.tag_en ?? '' },
  })

  const [sortOrder, setSortOrder] = useState(String(guide?.sort_order ?? 0))
  const [isActive, setIsActive]   = useState(guide?.is_active ?? true)
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(
    new Set(guide?.venue_ids ?? [])
  )

  const [coverPreview, setCoverPreview] = useState<string | null>(guide?.cover_url ?? null)
  const [coverFile, setCoverFile]       = useState<File | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  function updLf(field: keyof LangGuideFields, value: string) {
    setLf(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }))
  }

  function toggleVenue(id: string) {
    setSelectedVenues(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lf.hy.title.trim()) { setError('Armenian title is required'); setLang('hy'); return }
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
        title:       lf.hy.title || lf.ru.title || lf.en.title,
        title_hy:    lf.hy.title    || null,
        title_ru:    lf.ru.title    || null,
        title_en:    lf.en.title    || null,
        subtitle:    lf.hy.subtitle || lf.ru.subtitle || lf.en.subtitle,
        subtitle_hy: lf.hy.subtitle || null,
        subtitle_ru: lf.ru.subtitle || null,
        subtitle_en: lf.en.subtitle || null,
        tag:         lf.hy.tag || lf.ru.tag || lf.en.tag,
        tag_hy:      lf.hy.tag      || null,
        tag_ru:      lf.ru.tag      || null,
        tag_en:      lf.en.tag      || null,
        cover_url,
        sort_order:  parseInt(sortOrder) || 0,
        venue_ids:   Array.from(selectedVenues),
        is_active:   isActive,
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

      toast.success('Guide saved')
      router.refresh()
      onCancel()
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4"
    >
      <p className="text-sm font-semibold text-zinc-900">
        {mode === 'create' ? 'New guide' : `Edit — ${(guide as any)?.title_hy ?? guide?.title}`}
      </p>

      {/* Language selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-zinc-500">Language:</span>
        <LangTabs lang={lang} onChange={setLang} />
      </div>

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
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 transition-colors">
            {coverPreview ? 'Change cover' : 'Upload cover'}
          </button>
          {coverPreview && (
            <button type="button"
              onClick={() => { setCoverFile(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors text-left">
              Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={e => { const file = e.target.files?.[0]; if (!file) return; setCoverFile(file); setCoverPreview(URL.createObjectURL(file)) }}
            className="hidden" />
        </div>
      </div>

      {/* Text fields – translatable */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Title *</label>
          <input value={f.title} onChange={e => updLf('title', e.target.value)}
            placeholder="e.g. Best Wine Bars"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Subtitle</label>
          <input value={f.subtitle} onChange={e => updLf('subtitle', e.target.value)}
            placeholder="Short description"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Tag</label>
          <input value={f.tag} onChange={e => updLf('tag', e.target.value)}
            placeholder="e.g. Wine"
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Sort order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200" />
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
              <input type="checkbox" checked={selectedVenues.has(v.id)} onChange={() => toggleVenue(v.id)}
                className="rounded border-zinc-300" />
              {v.name}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-4 py-1.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : mode === 'create' ? 'Create guide' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-1.5 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
