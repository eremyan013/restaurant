'use client'

import { useTransition, useState, useEffect } from 'react'
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
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setConfirming(false) }, [status])

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
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => { setConfirming(false); handle(onCancel, 'Reservation cancelled') }}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                Back
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
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
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => { setConfirming(false); handle(onCancel, 'Reservation cancelled') }}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                Back
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
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
