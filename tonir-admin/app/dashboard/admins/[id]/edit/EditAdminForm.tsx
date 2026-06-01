'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { updateAdmin } from '../../actions'

export function EditAdminForm({
  admin,
  venues,
}: {
  admin: { id: string; name: string; email: string; managed_venue_id: string | null }
  venues: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(updateAdmin, { ok: false })

  useEffect(() => {
    if (state.ok) router.push('/dashboard/admins')
  }, [state.ok, router])

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      {!state.ok && state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {state.error}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={admin.id} />

        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">Name</label>
          <input
            name="name"
            required
            defaultValue={admin.name}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">Email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={admin.email}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">
            New password
            <span className="ml-1 text-zinc-400 font-normal">(leave blank to keep current)</span>
          </label>
          <input
            name="password"
            type="password"
            minLength={8}
            placeholder="Min 8 characters"
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">Venue</label>
          <select
            name="venue_id"
            required
            defaultValue={admin.managed_venue_id ?? ''}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2 border-t border-zinc-100">
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <a
            href="/dashboard/admins"
            className="px-5 py-2.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
