// Instant skeleton for the analytics page while Server Component runs
// multiple Supabase queries (reservations range, profiles, all-time counts).
// Mirrors the AnalyticsCharts component layout: KPIs → trend+status →
// peak bar chart → venue table + user growth chart.
export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header: title + range picker */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-28 bg-zinc-100 rounded-lg mb-2" />
          <div className="h-3.5 w-72 bg-zinc-100 rounded" />
        </div>
        {/* Range toggle (7d / 30d / 90d) */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 w-10 bg-zinc-200 rounded-md" />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Row 1: 5 KPI cards (2-col mobile → 5-col desktop) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="h-3 w-24 bg-zinc-100 rounded mb-3" />
              <div className="h-7 w-20 bg-zinc-100 rounded mb-2" />
              <div className="h-2.5 w-28 bg-zinc-100 rounded" />
            </div>
          ))}
        </div>

        {/* Row 2: Reservations trend chart (2/3) + Status breakdown (1/3) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5">
            <div className="h-3.5 w-44 bg-zinc-100 rounded mb-4" />
            {/* Chart area */}
            <div className="h-[220px] bg-zinc-50 rounded-lg" />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="h-3.5 w-32 bg-zinc-100 rounded mb-4" />
            {/* 4 status bars */}
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 w-20 bg-zinc-100 rounded" />
                    <div className="h-3 w-8 bg-zinc-100 rounded" />
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="h-3 w-32 bg-zinc-100 rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Row 3: Peak booking times bar chart (full width) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="h-3.5 w-36 bg-zinc-100 rounded mb-4" />
          <div className="h-[200px] bg-zinc-50 rounded-lg" />
        </div>

        {/* Row 4: Top venues table (2/3) + User growth chart (1/3) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5">
            <div className="h-3.5 w-24 bg-zinc-100 rounded mb-4" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-4 bg-zinc-100 rounded" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <div className="h-3 w-36 bg-zinc-100 rounded" />
                      <div className="flex gap-4">
                        <div className="h-3 w-16 bg-zinc-100 rounded" />
                        <div className="h-3 w-14 bg-zinc-100 rounded" />
                        <div className="h-3 w-16 bg-zinc-100 rounded" />
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="h-3.5 w-24 bg-zinc-100 rounded mb-1" />
            <div className="h-3 w-20 bg-zinc-100 rounded mb-4" />
            <div className="h-[180px] bg-zinc-50 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
