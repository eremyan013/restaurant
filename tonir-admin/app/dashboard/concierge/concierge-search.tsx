'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  initialQ?: string
}

export default function ConciergeSearch({ initialQ }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQ ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set('q', value.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push('/dashboard/concierge?' + params.toString())
  }

  function handleClear() {
    setValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('page')
    router.push('/dashboard/concierge?' + params.toString())
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Search by name…"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 w-56"
      />
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
      >
        Search
      </button>
      {initialQ && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Clear
        </button>
      )}
    </form>
  )
}
