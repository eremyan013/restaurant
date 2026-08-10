'use client'

import { useState, useEffect } from 'react'

interface Props {
  deadline:    string | null
  alertSentAt: string | null
}

export function SlaCountdown({ deadline, alertSentAt }: Props) {
  const [msLeft, setMsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline) { setMsLeft(null); return }
    const dl = deadline
    function tick() { setMsLeft(new Date(dl).getTime() - Date.now()) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (msLeft === null) return <span className="text-zinc-300">—</span>

  if (msLeft <= 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full w-fit">
          OVERDUE
        </span>
        {alertSentAt && (
          <span
            className="text-xs text-zinc-400 tabular-nums"
            title={`Last alert: ${new Date(alertSentAt).toLocaleString('en-GB', { timeZone: 'Asia/Yerevan' })}`}
          >
            Alert sent {formatRelative(alertSentAt)}
          </span>
        )}
      </div>
    )
  }

  const totalSec = Math.floor(msLeft / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`

  const colorClass =
    mins >= 15 ? 'text-green-700 bg-green-50'
    : mins >= 5 ? 'text-amber-700 bg-amber-50'
    : 'text-red-700 bg-red-50'

  return (
    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${colorClass}`}>
      {display}
    </span>
  )
}

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}
