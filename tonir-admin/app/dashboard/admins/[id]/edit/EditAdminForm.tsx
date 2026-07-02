'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { updateAdmin } from '../../actions'
import type { AdminPermissions } from '@/lib/permissions'
import { useToast } from '@/components/toast-provider'
import { PermissionPicker } from '@/components/permission-picker'

export function EditAdminForm({
  admin,
  venues,
  permissions,
}: {
  admin: { id: string; name: string; email: string; managed_venue_ids: string[] }
  venues: { id: string; name: string }[]
  permissions?: AdminPermissions
}) {
  const router = useRouter()
  const toast = useToast()
  const [state, action, pending] = useActionState(updateAdmin, { ok: false })

  useEffect(() => {
    if (state.ok) {
      toast.success('Admin updated')
      router.push('/dashboard/admins')
    } else if (state.error) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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
          <label className="text-sm font-medium text-zinc-700 mb-1 block">
            Venues <span className="text-zinc-400 font-normal text-xs">(select one or more)</span>
          </label>
          <div className="rounded-lg border border-zinc-300 divide-y divide-zinc-100 max-h-56 overflow-y-auto">
            {venues.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="venue_id"
                  value={v.id}
                  defaultChecked={(admin.managed_venue_ids ?? []).includes(v.id)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                />
                <span className="text-sm text-zinc-800">{v.name}</span>
              </label>
            ))}
          </div>
        </div>

        <PermissionPicker defaultPermissions={permissions} />

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
