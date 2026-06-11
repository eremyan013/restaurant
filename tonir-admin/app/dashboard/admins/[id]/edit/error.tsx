'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function AdminSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      section="admin settings"
      error={error}
      reset={reset}
      backHref="/dashboard/admins"
      backLabel="Back to admins"
    />
  )
}
