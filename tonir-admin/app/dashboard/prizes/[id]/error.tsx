'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function PrizeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      section="prize details"
      error={error}
      reset={reset}
      backHref="/dashboard/prizes"
      backLabel="Back to prizes"
    />
  )
}
