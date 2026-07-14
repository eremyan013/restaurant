// Instant skeleton for the dashboard page while Server Component fetches
// stats across venues, reservations, reviews, and activity log.
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title */}
      <div>
        <div className="h-7 w-36 bg-zinc-100 rounded-lg mb-6" />

        {/* Super-admin layout: 5 stat cards in a 2-col / 5-col grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="h-3 w-24 bg-zinc-100 rounded mb-3" />
              <div className="h-8 w-16 bg-zinc-100 rounded mb-2" />
              <div className="h-2.5 w-20 bg-zinc-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Trend strip: 4 segments divided horizontally */}
      <div className="bg-white rounded-xl border border-zinc-200 flex overflow-hidden divide-x divide-zinc-100">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 px-5 py-4">
            <div className="h-2.5 w-20 bg-zinc-100 rounded mb-3" />
            <div className="flex items-baseline gap-3">
              <div className="h-6 w-10 bg-zinc-100 rounded" />
              <div className="h-2 w-10 bg-zinc-100 rounded" />
              <div className="h-6 w-10 bg-zinc-100 rounded" />
              <div className="h-2 w-14 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content: 2/3 table + 1/3 sidebar cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's reservations table */}
        <div className="xl:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="h-3.5 w-40 bg-zinc-100 rounded" />
            <div className="h-3 w-14 bg-zinc-100 rounded" />
          </div>
          {/* Table header row */}
          <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex gap-4">
            {[48, 64, 80, 40, 56, 52].map((w, i) => (
              <div key={i} className={`h-3 bg-zinc-100 rounded`} style={{ width: w }} />
            ))}
          </div>
          {/* Table body rows */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`flex gap-4 px-4 py-3.5 border-b border-zinc-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}
            >
              <div className="h-3.5 w-12 bg-zinc-100 rounded" />
              <div className="h-3.5 w-28 bg-zinc-100 rounded" />
              <div className="h-3.5 w-24 bg-zinc-100 rounded" />
              <div className="h-3.5 w-6 bg-zinc-100 rounded" />
              <div className="h-3.5 w-16 bg-zinc-100 rounded" />
              <div className="h-5 w-20 bg-zinc-100 rounded-full" />
            </div>
          ))}
        </div>

        {/* Right column: top venues + activity feed */}
        <div className="flex flex-col gap-6">
          {/* Top Venues card */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="h-3.5 w-36 bg-zinc-100 rounded" />
              <div className="h-3 w-16 bg-zinc-100 rounded" />
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 last:border-0">
                <div className="h-3 w-3 bg-zinc-100 rounded" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 w-28 bg-zinc-100 rounded" />
                    <div className="h-3 w-8 bg-zinc-100 rounded" />
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity card */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <div className="h-3.5 w-32 bg-zinc-100 rounded" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-zinc-100 last:border-0">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-zinc-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-full bg-zinc-100 rounded mb-1.5" />
                  <div className="h-2.5 w-16 bg-zinc-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
