'use client'

import { useTransition, useState } from 'react'
import { useToast } from '@/components/toast-provider'

export function PrizeActiveToggle({
  prizeName,
  isActive,
  toggleAction,
}: {
  prizeName:    string
  isActive:     boolean
  toggleAction: () => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    if (!confirm(isActive ? `Deactivate "${prizeName}"?` : `Activate "${prizeName}"?`)) return
    startTransition(async () => {
      try {
        await toggleAction()
        toast.success(isActive ? `"${prizeName}" deactivated` : `"${prizeName}" activated`)
      } catch {
        toast.error('Failed to update prize status')
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${isActive ? 'bg-green-500' : 'bg-zinc-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
      />
    </button>
  )
}

export function PrizeDeleteButton({
  prizeName,
  deleteAction,
}: {
  prizeName:    string
  deleteAction: () => Promise<{ ok: boolean; error?: string }>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function handleConfirm() {
    setConfirming(true)
  }

  function handleDelete() {
    setConfirming(false)
    startTransition(async () => {
      try {
        const result = await deleteAction()
        if (!result.ok) {
          toast.error(result.error ?? 'Failed to delete prize')
        } else {
          toast.success('Prize deleted')
        }
      } catch {
        toast.error('Failed to delete prize')
      }
    })
  }

  if (pending) {
    return (
      <button
        disabled
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium opacity-50"
      >
        Deleting…
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700"
        >
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          type="button"
          className="px-2 py-1 rounded text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConfirm}
      className="w-20 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
    >
      Delete
    </button>
  )
}
