'use client'

import { useRouter } from 'next/navigation'

type AdminOption = {
  id: string
  name: string | null
}

type ActionOption = {
  key: string
  label: string
}

type Props = {
  defaultAdmin:     string
  defaultAction:    string
  adminOptions:     AdminOption[]
  actionOptions:    ActionOption[]
  hasActiveFilters: boolean
}

export function ActivityFilters({
  defaultAdmin,
  defaultAction,
  adminOptions,
  actionOptions,
  hasActiveFilters,
}: Props) {
  const router = useRouter()

  function navigate(admin: string, action: string) {
    const params = new URLSearchParams()
    if (admin)  params.set('admin',  admin)
    if (action) params.set('action', action)
    const qs = params.toString()
    router.push(`/dashboard/activity${qs ? '?' + qs : ''}`)
  }

  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      <select
        value={defaultAdmin || ''}
        onChange={(e) => navigate(e.target.value, defaultAction)}
        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
      >
        <option value="">All admins</option>
        {adminOptions.map(({ id, name }) => (
          <option key={id} value={id}>{name ?? id}</option>
        ))}
      </select>

      <select
        value={defaultAction || ''}
        onChange={(e) => navigate(defaultAdmin, e.target.value)}
        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
      >
        <option value="">All actions</option>
        {actionOptions.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/activity')}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}
