const PAGE_SIZE = 50

interface Props {
  page: number
  total: number
  prevHref: string | null
  nextHref: string | null
}

export const PAGINATION_SIZE = PAGE_SIZE

export function Pagination({ page, total, prevHref, nextHref }: Props) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
      <span>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <a href={prevHref} className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-700">
            ← Previous
          </a>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-300 select-none">
            ← Previous
          </span>
        )}
        <span className="text-zinc-400 tabular-nums">
          {page} / {totalPages}
        </span>
        {nextHref ? (
          <a href={nextHref} className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-700">
            Next →
          </a>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-300 select-none">
            Next →
          </span>
        )}
      </div>
    </div>
  )
}
