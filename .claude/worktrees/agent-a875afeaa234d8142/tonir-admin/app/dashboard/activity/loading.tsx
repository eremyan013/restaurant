// Instant skeleton for the activity log page while Server Component fetches
// the log entries and builds the admin filter dropdown from 500-row scan.
// Mirrors the page layout: title+count → filter bar (2 selects) → table.
export default function ActivityLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header: title + entry count */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-zinc-100 rounded-lg" />
        <div className="h-4 w-20 bg-zinc-100 rounded" />
      </div>

      {/* Filter bar: admin select + action select + Filter button */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="h-9 w-36 bg-zinc-100 rounded-lg" />
        <div className="h-9 w-44 bg-zinc-100 rounded-lg" />
        <div className="h-9 w-20 bg-zinc-100 rounded-lg" />
      </div>

      {/* Activity log table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {/* Table header: When / Admin / Action / Subject / Details */}
        <div className="bg-zinc-50 border-b border-zinc-100 flex gap-4 px-4 py-3">
          {[80, 80, 120, 120, 160].map((w, i) => (
            <div key={i} className="h-3 bg-zinc-100 rounded" style={{ width: w }} />
          ))}
        </div>

        {/* Log rows — alternating background */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 px-4 py-3.5 border-b border-zinc-100 last:border-0 items-start ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}
          >
            {/* When (timestamp) */}
            <div className="h-3 w-24 bg-zinc-100 rounded shrink-0" />
            {/* Admin name */}
            <div className="h-3.5 w-24 bg-zinc-100 rounded shrink-0" />
            {/* Action badge */}
            <div className="h-5 w-32 bg-zinc-100 rounded-full shrink-0" />
            {/* Subject: entity_name + entity_type */}
            <div className="shrink-0">
              <div className="h-3.5 w-36 bg-zinc-100 rounded mb-1.5" />
              <div className="h-2.5 w-20 bg-zinc-100 rounded" />
            </div>
            {/* Details (mono key: value pairs) */}
            <div className="h-3 w-48 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
