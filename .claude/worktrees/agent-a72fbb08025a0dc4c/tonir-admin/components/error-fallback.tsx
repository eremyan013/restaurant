'use client'

import Link from 'next/link'

interface ErrorFallbackProps {
  section: string
  error: Error & { digest?: string }
  reset: () => void
  backHref?: string
  backLabel?: string
}

export function ErrorFallback({ section, error, reset, backHref, backLabel }: ErrorFallbackProps) {
  return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-red-50 rounded-xl border border-red-200">
      <h2 className="text-base font-semibold text-red-700 mb-1">
        Failed to load {section}
      </h2>
      <p className="text-sm text-zinc-500 mb-4">
        The page encountered an error while fetching data. This is usually temporary — try again or return to the dashboard.
      </p>

      {process.env.NODE_ENV !== 'production' && error.message && (
        <p className="text-xs text-zinc-500 font-mono bg-white border border-red-100 rounded-lg px-3 py-2 mb-4 break-all">
          {error.message}
        </p>
      )}

      {error.digest && (
        <p className="text-xs text-zinc-400 mb-4">
          Error ID: <span className="font-mono">{error.digest}</span>
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
        >
          Try again
        </button>

        {backHref && backLabel && (
          <Link
            href={backHref}
            className="px-4 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium transition-colors"
          >
            {backLabel}
          </Link>
        )}

        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
