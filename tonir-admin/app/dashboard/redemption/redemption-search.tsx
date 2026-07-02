'use client'

import { useState } from 'react'

interface RedemptionSearchProps {
  initialCode: string
}

export function RedemptionSearch({ initialCode }: RedemptionSearchProps) {
  const [code, setCode] = useState(initialCode)

  return (
    <form method="GET" action="/dashboard/redemption" className="flex gap-2 mb-8">
      <input
        type="text"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="YEL-XXXXXX"
        autoComplete="off"
        autoFocus
        className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
      />
      <button
        type="submit"
        className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      >
        Look up
      </button>
    </form>
  )
}
