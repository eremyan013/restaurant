'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateUser, UpdateUserState } from './actions'
import { useToast } from '@/components/toast-provider'

interface Props {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    tier_level: number
  }
}

const INIT: UpdateUserState = { ok: false }

export function UserEditForm({ user }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(updateUser, INIT)
  const toast = useToast()

  useEffect(() => {
    if (state.ok) {
      toast.success('User updated')
      setOpen(false)
    } else if (state.error) {
      toast.error(state.error ?? 'Failed to update user')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Edit User</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form action={action} className="space-y-4">
              <input type="hidden" name="id" value={user.id} />

              <Field label="Name">
                <input
                  name="name"
                  type="text"
                  defaultValue={user.name}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </Field>

              <Field label="Phone">
                <input
                  name="phone"
                  type="tel"
                  defaultValue={user.phone ?? ''}
                  placeholder="+37412345678"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </Field>

              <Field label="Tier Level">
                <select
                  name="tier_level"
                  defaultValue={user.tier_level}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                >
                  <option value={1}>1 — Tonir</option>
                  <option value={2}>2 — Pandok</option>
                  <option value={3}>3 — Areni</option>
                  <option value={4}>4 — Master</option>
                </select>
              </Field>

              {!state.ok && state.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {state.error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}
