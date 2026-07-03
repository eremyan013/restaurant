'use client'

import { useRef, useEffect } from 'react'
import type { ConciergeMessageRow } from '@/lib/database.types'

interface Props {
  messages: ConciergeMessageRow[]
}

export default function ConciergeThread({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-8">No messages in this session.</p>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isUser  = msg.role === 'user'
        const isAdmin = msg.role === 'admin'

        return (
          <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-sm rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-zinc-900 text-white rounded-tr-sm'
                : isAdmin
                  ? 'bg-blue-600 text-white rounded-tl-sm'
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm'
            }`}>
              {isAdmin && (
                <p className="text-xs font-medium text-blue-200 mb-1">Staff</p>
              )}
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(msg.suggestions as string[]).map((s: string) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-500">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p className={`text-xs mt-1 ${isUser || isAdmin ? 'text-white/50' : 'text-zinc-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
