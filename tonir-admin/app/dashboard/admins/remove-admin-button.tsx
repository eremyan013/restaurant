'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

export function RemoveAdminButton({
  adminId,
  adminName,
  action,
}: {
  adminId: string
  adminName: string
  action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function handleConfirm() {
    setConfirming(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', adminId)
      const result = await action(fd)
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to remove admin')
      } else {
        toast.success(`${adminName} removed`)
      }
    })
  }

  if (pending) {
    return (
      <button
        disabled
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium opacity-50 cursor-not-allowed flex items-center gap-1.5"
      >
        <span className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        Removing…
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleConfirm}
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
        >
          Yes, remove
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
    >
      Remove
    </button>
  )
}
