'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
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
import type { BannerRow } from '@/lib/database.types'
import type { createBanner, toggleBanner, deleteBanner, reorderBanners } from './actions'

type CreateBannerFn   = typeof createBanner
type ToggleBannerFn   = typeof toggleBanner
type DeleteBannerFn   = typeof deleteBanner
type ReorderBannersFn = typeof reorderBanners

function SortableRow({
  banner,
  onToggle,
  onDelete,
}: {
  banner: BannerRow
  onToggle: ToggleBannerFn
  onDelete: DeleteBannerFn
}) {
  const [, startTransition] = useTransition()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="odd:bg-white even:bg-zinc-50 border-b border-zinc-100 last:border-0"
    >
      <td className="px-2 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 text-lg leading-none px-1 select-none"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
      </td>
      <td className="px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image_url} alt="" className="w-20 h-10 object-cover rounded-md bg-zinc-100" />
      </td>
      <td className="px-4 py-3 font-medium text-zinc-900 max-w-[160px] truncate">
        {banner.title ?? <span className="text-zinc-400 italic">—</span>}
      </td>
      <td className="px-4 py-3 text-zinc-600 text-sm">{banner.tap_action}</td>
      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
        {banner.start_date || banner.end_date
          ? `${banner.start_date ?? '∞'} → ${banner.end_date ?? '∞'}`
          : 'Always'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => startTransition(() => onToggle(banner.id, !banner.is_active))}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${banner.is_active ? 'bg-green-500' : 'bg-zinc-300'}`}
          title={banner.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${banner.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => startTransition(() => onDelete(banner.id))}
          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

export function BannersClient({
  initialBanners,
  onCreate,
  onToggle,
  onDelete,
  onReorder,
}: {
  initialBanners: BannerRow[]
  onCreate:  CreateBannerFn
  onToggle:  ToggleBannerFn
  onDelete:  DeleteBannerFn
  onReorder: ReorderBannersFn
}) {
  const [banners, setBanners] = useState(initialBanners)
  const [, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function closeModal() {
    setModalOpen(false)
    setImageUrl('')
    setImagePreview(null)
    formRef.current?.reset()
  }

  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = banners.findIndex((b) => b.id === active.id)
    const newIndex = banners.findIndex((b) => b.id === over.id)
    const reordered = arrayMove(banners, oldIndex, newIndex)
    setBanners(reordered)
    startTransition(() => onReorder(reordered.map((b) => b.id)))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload-banner', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setImageUrl(json.url)
        setImagePreview(json.url)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!imageUrl) return
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    fd.set('image_url', imageUrl)
    try {
      const result = await onCreate(fd)
      if (!result?.error && result?.banner) {
        setBanners((prev) => [...prev, result.banner!])
        closeModal()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Banners
          <span className="ml-2 text-sm font-normal text-zinc-400">{banners.length} total</span>
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Add banner
        </button>
      </div>

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No banners yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                <th scope="col" className="px-2 py-3 w-8"></th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Preview</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Title</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Tap action</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Schedule</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {banners.map((b) => (
                    <SortableRow key={b.id} banner={b} onToggle={onToggle} onDelete={onDelete} />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      {/* Add banner modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-xl border border-zinc-200 p-6 w-full max-w-2xl mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Add banner</h2>
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">

              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-medium text-zinc-500">Image *</label>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    value={imageUrl}
                    onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value || null) }}
                    placeholder="Paste image URL…"
                    className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-zinc-400 text-xs">or</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-10 px-3 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-sm text-zinc-600 whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading…' : 'Upload from computer'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="preview" className="h-10 w-16 object-cover rounded-md border border-zinc-200 bg-zinc-100" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Title</label>
                <input name="title" placeholder="Optional overlay title"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Subtitle</label>
                <input name="subtitle" placeholder="Optional subtitle"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Tap action</label>
                <select name="tap_action"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="none">None</option>
                  <option value="external_url">External URL</option>
                  <option value="deep_link">Deep link</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Tap URL / deep link</label>
                <input name="tap_url" placeholder="https://… or venue/id or map"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Start date</label>
                <input name="start_date" type="date"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">End date</label>
                <input name="end_date" type="date"
                  className="h-10 px-3 rounded-lg border border-zinc-300 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button
                type="submit"
                disabled={!imageUrl || submitting}
                className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding…' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
