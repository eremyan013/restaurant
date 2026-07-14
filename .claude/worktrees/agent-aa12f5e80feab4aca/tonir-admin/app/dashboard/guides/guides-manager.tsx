'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GuideRow } from '@/lib/database.types'
import { GuideForm } from '@/components/guide-form'
import { useToast } from '@/components/toast-provider'

type Venue = { id: string; name: string }

interface Props {
  guides: GuideRow[]
  venues: Venue[]
  toggleActive: (id: string, current: boolean) => Promise<void>
}

export function GuidesManager({ guides, venues, toggleActive }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [showCreate, setShowCreate]   = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this guide? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/guides/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to delete guide')
      } else {
        toast.success('Guide deleted')
        router.refresh()
      }
    } catch {
      toast.error('Failed to delete guide')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Guides</h1>
        {!showCreate && (
          <button
            onClick={() => { setShowCreate(true); setEditingId(null) }}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            + New guide
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <GuideForm
          mode="create"
          venues={venues}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Guides table */}
      {guides.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          No guides yet. Create your first one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">Cover</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Title</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Tag</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Order</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Venues</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th className="px-4 py-3 font-medium text-zinc-500"></th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <React.Fragment key={guide.id}>
                  <tr
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors align-middle"
                  >
                    <td className="px-4 py-3">
                      {guide.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={guide.cover_url}
                          alt={guide.title}
                          className="w-14 h-10 rounded-md object-cover bg-zinc-100"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-md bg-zinc-100" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{guide.title}</p>
                      <p className="text-xs text-zinc-400">{guide.subtitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                        {guide.tag}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{guide.sort_order}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {guide.venue_ids.length > 0 ? `${guide.venue_ids.length} venues` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggleActive.bind(null, guide.id, guide.is_active)}>
                        <button
                          type="submit"
                          aria-label={guide.is_active ? `Deactivate ${guide.title}` : `Activate ${guide.title}`}
                          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${guide.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                          <span className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${guide.is_active ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingId(editingId === guide.id ? null : guide.id)
                            setShowCreate(false)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors"
                        >
                          {editingId === guide.id ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(guide.id)}
                          disabled={deletingId === guide.id}
                          aria-label={`Delete guide: ${guide.title}`}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-40 transition-colors"
                        >
                          {deletingId === guide.id ? '…' : '✕'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit form */}
                  {editingId === guide.id && (
                    <tr key={`${guide.id}-edit`} className="border-b border-zinc-100 bg-zinc-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <GuideForm
                          mode="edit"
                          guide={guide}
                          venues={venues}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
