'use client'

import { useState } from 'react'

export function ConfirmButton({
  message: _message,
  className,
  children,
}: {
  message: string
  className?: string
  children: React.ReactNode
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          type="submit"
          className={`flex-1 ${className ?? ''}`.trim()}
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="shrink-0 px-4 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => setConfirming(true)}
    >
      {children}
    </button>
  )
}
