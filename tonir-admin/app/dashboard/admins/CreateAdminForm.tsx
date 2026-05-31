'use client'

import { useActionState } from 'react'
import { createAdmin } from './actions'

export function CreateAdminForm({
  venues,
}: {
  venues: { id: string; name: string }[]
}) {
  const [state, action, pending] = useActionState(createAdmin, { ok: false })

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 h-fit">
      <h2 className="text-base font-semibold text-zinc-900 mb-4">Create Admin Account</h2>

      {!state.ok && state.error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Admin account created successfully.
        </div>
      )}

      <form action={action} className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Name</label>
          <input
            name="name"
            required
            placeholder="Restaurant name or manager"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@restaurant.am"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min 8 characters"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Venue</label>
          <select
            name="venue_id"
            required
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating…' : 'Create Admin'}
        </button>
      </form>
    </div>
  )
}
