'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast-provider'

type ActionKey = 'approve' | 'hide' | 'delete'

function Spinner() {
  return (
    <span className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
  )
}

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
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handle(key: ActionKey, action: () => Promise<void>, successMsg: string) {
    setPendingAction(key)
    startTransition(async () => {
      try {
        await action()
        toast.success(successMsg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 justify-end">
      {status !== 'approved' && (
        <button
          onClick={() => handle('approve', onApprove, 'Review approved')}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {pendingAction === 'approve' && <Spinner />}
          Approve
        </button>
      )}
      {status !== 'hidden' && (
        <button
          onClick={() => handle('hide', onHide, 'Review hidden')}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {pendingAction === 'hide' && <Spinner />}
          Hide
        </button>
      )}
      {confirmingDelete ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setConfirmingDelete(false); handle('delete', onDelete, 'Review deleted') }}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {pendingAction === 'delete' && <Spinner />}
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </div>
  )
}
