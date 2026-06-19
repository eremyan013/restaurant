'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

type Status = 'pending' | 'confirmed' | 'cancelled' | 'visited'

export function ReservationStatusButtons({
  status,
  onConfirm,
  onCancel,
  onVisited,
  onReopen,
}: {
  status:     Status
  onConfirm:  () => Promise<void>
  onCancel:   () => Promise<void>
  onVisited:  () => Promise<void>
  onReopen:   () => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handle(action: () => Promise<void>, msg: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(msg)
      } catch {
        toast.error('Failed to update reservation')
      }
    })
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {status === 'pending' && (
        <>
          <button
            onClick={() => handle(onConfirm, 'Reservation confirmed')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => handle(onCancel, 'Reservation cancelled')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      )}
      {status === 'confirmed' && (
        <>
          <button
            onClick={() => handle(onVisited, 'Marked as visited')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Visited
          </button>
          <button
            onClick={() => handle(onCancel, 'Reservation cancelled')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      )}
      {(status === 'cancelled' || status === 'visited') && (
        <button
          onClick={() => handle(onReopen, 'Reservation reopened')}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          Reopen
        </button>
      )}
    </div>
  )
}
