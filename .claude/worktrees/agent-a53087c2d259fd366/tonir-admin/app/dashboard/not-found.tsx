import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-xl border border-zinc-200">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Record not found</h2>
      <p className="text-sm text-zinc-500 mb-6">
        This item may have been deleted or you may have followed an outdated link.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
