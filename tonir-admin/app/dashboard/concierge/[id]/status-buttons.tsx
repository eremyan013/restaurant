'use client'

import { useTransition } from 'react'

interface Props {
  sessionId: string
  status: string
  onMarkResolved: () => Promise<void>
  onMarkEscalated: () => Promise<void>
  onReopen: () => Promise<void>
}

export default function ConciergeStatusButtons({
  status,
  onMarkResolved,
  onMarkEscalated,
  onReopen,
}: Props) {
  const [pending, startTransition] = useTransition()

  function trigger(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
    })
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {status === 'escalated' && (
        <button
          onClick={() => trigger(onMarkResolved)}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Mark resolved'}
        </button>
      )}
      {status === 'active' && (
        <button
          onClick={() => trigger(onMarkEscalated)}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Mark escalated'}
        </button>
      )}
      {status === 'resolved' && (
        <button
          onClick={() => trigger(onReopen)}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Reopen'}
        </button>
      )}
    </div>
  )
}
