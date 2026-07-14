'use client'

import { ErrorFallback } from '@/components/error-fallback'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback section="this page" error={error} reset={reset} />
}
