'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function UserProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      section="user profile"
      error={error}
      reset={reset}
      backHref="/dashboard/users"
      backLabel="Back to users"
    />
  )
}
