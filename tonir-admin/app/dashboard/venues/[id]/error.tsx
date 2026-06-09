'use client'

export default function VenueEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-xl border border-red-200">
      <h2 className="text-lg font-semibold text-red-700 mb-2">Error loading venue</h2>
      <p className="text-sm text-zinc-600 mb-4 font-mono bg-zinc-50 p-3 rounded-lg break-all">
        {error.message || 'Unknown error'}
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-400 mb-4">Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
