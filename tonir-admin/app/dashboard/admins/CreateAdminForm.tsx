'use client'

import { useActionState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createAdmin } from './actions'
import { zCreateAdminSchema, type CreateAdminInput } from '@/lib/schemas'
import { FieldError } from '@/components/field-error'
import { useToast } from '@/components/toast-provider'

export function CreateAdminForm({ venues }: { venues: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createAdmin, { ok: false })
  const toast = useToast()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateAdminInput>({
    resolver: zodResolver(zCreateAdminSchema),
    defaultValues: { name: '', email: '', password: '', managed_venue_ids: [] },
  })

  useEffect(() => {
    if (state.ok) {
      toast.success('Admin account created')
    } else if (state.error) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  function onValid(data: CreateAdminInput) {
    const fd = new FormData()
    fd.set('name',     data.name)
    fd.set('email',    data.email)
    fd.set('password', data.password)
    for (const id of data.managed_venue_ids) fd.append('venue_id', id)
    ;(action as unknown as (fd: FormData) => void)(fd)
    reset()
  }

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

      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3" noValidate>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Name</label>
          <input
            {...register('name')}
            placeholder="Restaurant name or manager"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <FieldError message={errors.name?.message} />
          {!state.ok && state.fieldErrors?.name && <FieldError message={state.fieldErrors.name} />}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="admin@restaurant.am"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <FieldError message={errors.email?.message} />
          {!state.ok && state.fieldErrors?.email && <FieldError message={state.fieldErrors.email} />}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="Min 8 characters"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <FieldError message={errors.password?.message} />
          {!state.ok && state.fieldErrors?.password && <FieldError message={state.fieldErrors.password} />}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Venues <span className="text-zinc-400 font-normal">(select one or more)</span>
          </label>
          <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 max-h-48 overflow-y-auto">
            {venues.map(v => (
              <label key={v.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 cursor-pointer">
                <input
                  type="checkbox"
                  value={v.id}
                  {...register('managed_venue_ids')}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                />
                <span className="text-sm text-zinc-800">{v.name}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors.managed_venue_ids?.message as string | undefined} />
          {!state.ok && state.fieldErrors?.managed_venue_ids && (
            <FieldError message={state.fieldErrors.managed_venue_ids as string} />
          )}
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
