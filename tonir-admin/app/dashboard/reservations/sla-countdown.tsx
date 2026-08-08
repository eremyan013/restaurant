'use client'

import { useState, useEffect } from 'react'

export function SlaCountdown({ deadline }: { deadline: string | null }) {
  const [msLeft, setMsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline) { setMsLeft(null); return }
    function tick() { setMsLeft(new Date(deadline).getTime() - Date.now()) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (msLeft === null) return <span className="text-zinc-300">—</span>

  if (msLeft <= 0) {
    return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OVERDUE</span>
  }

  const totalSec = Math.floor(msLeft / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`

  const colorClass = mins >= 15
    ? 'text-green-700 bg-green-50'
    : mins >= 5
    ? 'text-amber-700 bg-amber-50'
    : 'text-red-700 bg-red-50'

  return (
    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${colorClass}`}>
      {display}
    </span>
  )
}
