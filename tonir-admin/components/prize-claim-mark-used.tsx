'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

export function PrizeClaimMarkUsed({ markUsedAction }: { markUsedAction: () => Promise<void> }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          try {
            await markUsedAction()
            toast.success('Marked as used')
          } catch {
            toast.error('Failed to mark as used')
          }
        })
      }}
      disabled={pending}
      className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Mark used'}
    </button>
  )
}
