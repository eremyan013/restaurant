'use client'
import { useState, useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

export function NoteForm({ id, status, defaultNote, saveNote }: {
  id: string
  status: string
  defaultNote: string
  saveNote: (id: string, fd: FormData) => Promise<void>
}) {
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  return (
    <form
      className="flex gap-1.5"
      action={async (fd) => {
        startTransition(async () => {
          try {
            await saveNote(id, fd)
            setSaved(true)
            toast.success('Note saved')
            setTimeout(() => setSaved(false), 2000)
          } catch {
            toast.error('Failed to save note')
          }
        })
      }}
    >
      <input type="hidden" name="status" value={status} />
      <input
        type="text"
        name="admin_note"
        defaultValue={defaultNote}
        placeholder="Admin note…"
        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 w-32 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-zinc-800 text-white hover:bg-zinc-600'
        }`}
      >
        {isPending ? '…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </form>
  )
}
