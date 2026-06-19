'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

export function ReviewActionButtons({
  status,
  onApprove,
  onHide,
  onDelete,
}: {
  status:    string
  onApprove: () => Promise<void>
  onHide:    () => Promise<void>
  onDelete:  () => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handle(action: () => Promise<void>, successMsg: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    startTransition(async () => {
      try {
        await action()
        toast.success(successMsg)
      } catch {
        toast.error('Action failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 justify-end">
      {status !== 'approved' && (
        <button
          onClick={() => handle(onApprove, 'Review approved')}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status !== 'hidden' && (
        <button
          onClick={() => handle(onHide, 'Review hidden')}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          Hide
        </button>
      )}
      <button
        onClick={() => handle(onDelete, 'Review deleted', 'Delete this review permanently?')}
        disabled={pending}
        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  )
}
