'use client'

import { useState } from 'react'

type Props = {
  initialAmount: string
}

export function BulkAmountInput({ initialAmount }: Props) {
  const [amount, setAmount] = useState(initialAmount)

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="number"
        name="amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 100 or -50"
        className="w-40 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />
      {[50, 100, 250, 500].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setAmount(String(n))}
          className="px-3 py-2 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors"
        >
          +{n}
        </button>
      ))}
    </div>
  )
}
