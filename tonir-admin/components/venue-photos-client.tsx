'use client'

import { useTransition, useRef } from 'react'
import Image from 'next/image'
import { useToast } from '@/components/toast-provider'

type VenuePhoto = { id: string; url: string; sort_order: number }
const MAX_PHOTOS = 20

function PhotoTile({
  photo,
  removeAction,
}: {
  photo: VenuePhoto
  removeAction: (photoId: string) => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm('Remove this photo?')) return
    startTransition(async () => {
      try {
        await removeAction(photo.id)
        toast.success('Photo removed')
      } catch {
        toast.error('Failed to remove photo')
      }
    })
  }

  return (
    <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 flex-shrink-0">
      <Image
        src={photo.url}
        alt="Venue photo"
        fill
        sizes="96px"
        className="object-cover"
        unoptimized
      />
      <button
        onClick={handleRemove}
        disabled={pending}
        aria-label="Remove photo"
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        <span className="text-white text-xs font-semibold">
          {pending ? '…' : 'Remove'}
        </span>
      </button>
    </div>
  )
}

export function VenuePhotosClient({
  venueId,
  initialPhotos,
  addPhotoAction,
  removePhotoAction,
}: {
  venueId: string
  initialPhotos: VenuePhoto[]
  addPhotoAction: (url: string) => Promise<void>
  removePhotoAction: (photoId: string) => Promise<void>
}) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const atCap = initialPhotos.length >= MAX_PHOTOS

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''
    startUpload(async () => {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload-venue-photo', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const { url } = await res.json() as { url: string }
        await addPhotoAction(url)
        toast.success('Photo uploaded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  return (
    <div>
      {initialPhotos.length === 0 && (
        <p className="text-sm text-zinc-400 mb-4">No photos yet.</p>
      )}
      {initialPhotos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {initialPhotos.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} removeAction={removePhotoAction} />
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-400 mb-3">{initialPhotos.length} / {MAX_PHOTOS} photos</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading || atCap}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || atCap}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading…' : atCap ? 'Limit reached (20)' : 'Upload photo'}
      </button>
    </div>
  )
}
