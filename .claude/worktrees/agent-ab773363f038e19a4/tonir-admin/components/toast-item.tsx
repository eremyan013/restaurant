'use client'

import { useEffect, useRef } from 'react'
import type { Toast, ToastVariant } from './toast-provider'

const VARIANT_STYLES: Record<ToastVariant, {
  border: string
  iconBg: string
  iconColor: string
  iconText: string
}> = {
  success: {
    border: 'border-l-green-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    iconText: '✓',
  },
  error: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    iconText: '✕',
  },
  warning: {
    border: 'border-l-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    iconText: '!',
  },
  info: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    iconText: 'i',
  },
}

interface Props {
  toast: Toast
  onDismiss: (id: string) => void
}

export function ToastItem({ toast, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  function startTimer() {
    if (toast.duration === 0) return
    clearTimer()
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.duration)
  }

  useEffect(() => {
    startTimer()
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.duration])

  const s = VARIANT_STYLES[toast.variant]

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className={`
        pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-md
        bg-white border border-zinc-200 border-l-4 ${s.border}
      `}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 w-5 h-5 rounded-full ${s.iconBg} ${s.iconColor} text-xs font-bold flex items-center justify-center mt-0.5`}
      >
        {s.iconText}
      </span>
      <p className="flex-1 text-sm text-zinc-800 leading-snug">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-zinc-400 hover:text-zinc-600 text-lg leading-none transition-colors cursor-pointer"
      >
        ×
      </button>
    </div>
  )
}
