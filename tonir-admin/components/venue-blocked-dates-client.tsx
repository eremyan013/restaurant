'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

type BlockedDate = { id: string; date: string; reason: string | null }

function BlockedDateRow({
  bd,
  removeAction,
}: {
  bd: BlockedDate
  removeAction: (dateId: string) => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm(`Remove blocked date ${bd.date}?`)) return
    startTransition(async () => {
      try {
        await removeAction(bd.id)
        toast.success('Blocked date removed')
      } catch {
        toast.error('Failed to remove blocked date')
      }
    })
  }

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-3 font-medium text-zinc-900 tabular-nums">{bd.date}</td>
      <td className="px-4 py-3 text-zinc-500">{bd.reason ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleRemove}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {pending ? 'Removing…' : 'Remove'}
        </button>
      </td>
    </tr>
  )
}

export function VenueBlockedDatesClient({
  blockedDates,
  addBlockedDateAction,
  removeBlockedDateAction,
}: {
  blockedDates: BlockedDate[]
  addBlockedDateAction: (fd: FormData) => Promise<void>
  removeBlockedDateAction: (dateId: string) => Promise<void>
}) {
  const toast = useToast()
  const [addPending, startAddTransition] = useTransition()

  return (
    <>
      {blockedDates.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Reason</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {blockedDates.map((bd) => (
                <BlockedDateRow
                  key={bd.id}
                  bd={bd}
                  removeAction={removeBlockedDateAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={async (fd) => {
          startAddTransition(async () => {
            try {
              await addBlockedDateAction(fd)
              toast.success('Date blocked')
            } catch {
              toast.error('Failed to block date')
            }
          })
        }}
        className="flex items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Date</label>
          <input
            type="date"
            name="date"
            required
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-zinc-500">Reason (optional)</label>
          <input
            type="text"
            name="reason"
            placeholder="e.g. Private event, Holiday"
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700 placeholder-zinc-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={addPending}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shrink-0 disabled:opacity-50"
        >
          {addPending ? 'Blocking…' : 'Block date'}
        </button>
      </form>
    </>
  )
}
