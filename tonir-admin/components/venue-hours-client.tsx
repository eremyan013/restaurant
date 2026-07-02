'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type HourEntry = {
  is_open: boolean
  open_time: string | null
  close_time: string | null
}

export function VenueHoursClient({
  hoursMap,
  saveHoursAction,
}: {
  hoursMap: Record<number, HourEntry>
  saveHoursAction: (fd: FormData) => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={async (fd) => {
        startTransition(async () => {
          try {
            await saveHoursAction(fd)
            toast.success('Opening hours saved')
          } catch {
            toast.error('Failed to save opening hours')
          }
        })
      }}
    >
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500 w-32">Day</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500 w-24">Open?</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Opens at</th>
              <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Closes at</th>
            </tr>
          </thead>
          <tbody>
            {DAY_NAMES.map((name, day) => {
              const h = hoursMap[day]
              const isOpen = h ? h.is_open : true
              return (
                <tr key={day} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-700">{name}</td>
                  <td className="px-4 py-3">
                    <select
                      name={`is_open_${day}`}
                      defaultValue={isOpen ? 'true' : 'false'}
                      className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none"
                    >
                      <option value="true">Open</option>
                      <option value="false">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      name={`open_time_${day}`}
                      defaultValue={h?.open_time ?? '10:00'}
                      className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      name={`close_time_${day}`}
                      defaultValue={h?.close_time ?? '23:00'}
                      className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save hours'}
      </button>
    </form>
  )
}
