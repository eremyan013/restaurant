'use client'

import { useTransition } from 'react'
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
  deleteAction: () => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${prizeName}"?`)) return
    startTransition(async () => {
      try {
        await deleteAction()
        toast.success('Prize deleted')
      } catch {
        toast.error('Failed to delete prize')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
