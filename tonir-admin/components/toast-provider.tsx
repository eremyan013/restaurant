'use client'

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react'
import { ToastItem } from './toast-item'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration: number
}

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'DISMISS'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state.slice(-4), action.toast]
    case 'DISMISS':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

interface ToastContextValue {
  toasts: Toast[]
  dismiss: (id: string) => void
  success: (message: string, duration?: number) => void
  error:   (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info:    (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'DISMISS', id })
  }, [])

  const add = useCallback(
    (variant: ToastVariant, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      dispatch({ type: 'ADD', toast: { id, variant, message, duration } })
    },
    []
  )

  const value: ToastContextValue = {
    toasts,
    dismiss,
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2 w-80"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return ctx
}
