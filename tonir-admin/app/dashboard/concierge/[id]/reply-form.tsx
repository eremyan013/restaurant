'use client'

import { useRef, useState, useTransition } from 'react'
import { useToast } from '@/components/toast-provider'

interface Props {
  onSend: (text: string) => Promise<void>
}

export default function ConciergeReplyForm({ onSend }: Props) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await onSend(trimmed)
        setText('')
        textareaRef.current?.focus()
        toast.success('Reply sent')
      } catch {
        toast.error('Failed to send reply')
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={pending}
          rows={2}
          maxLength={4000}
          placeholder="Reply as admin… (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
      </form>
      <p className={`text-xs text-right mt-1 ${text.length > 3800 ? 'text-red-500' : 'text-zinc-400'}`}>
        <span>{text.length}</span>/4000
      </p>
    </div>
  )
}
