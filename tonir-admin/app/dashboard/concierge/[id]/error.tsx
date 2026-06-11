'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function ConciergeSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      section="concierge session"
      error={error}
      reset={reset}
      backHref="/dashboard/concierge"
      backLabel="Back to inbox"
    />
  )
}
