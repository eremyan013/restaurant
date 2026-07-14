'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function VenueDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      section="venue details"
      error={error}
      reset={reset}
      backHref="/dashboard/venues"
      backLabel="Back to venues"
    />
  )
}
