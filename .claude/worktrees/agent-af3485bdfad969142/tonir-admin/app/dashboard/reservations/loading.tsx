// Instant skeleton for the reservations page while Server Component resolves
// auth, venue scoping, guest pre-filter, main query, and status counts.
// Mirrors the page layout: title+action → filters → status tabs → table.
export default function ReservationsLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header: title + total count + New Reservation button */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 bg-zinc-100 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-16 bg-zinc-100 rounded" />
          <div className="h-9 w-40 bg-zinc-100 rounded-lg" />
        </div>
      </div>

      {/* Filter bar: venue select, date range (from/to), guest, people, note, submit */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Venue select */}
        <div className="h-9 w-36 bg-zinc-100 rounded-lg" />
        {/* From date */}
        <div className="h-9 w-28 bg-zinc-100 rounded-lg" />
        {/* To date */}
        <div className="h-9 w-28 bg-zinc-100 rounded-lg" />
        {/* Guest name */}
        <div className="h-9 w-40 bg-zinc-100 rounded-lg" />
        {/* People min/max */}
        <div className="h-9 w-20 bg-zinc-100 rounded-lg" />
        <div className="h-9 w-20 bg-zinc-100 rounded-lg" />
        {/* Note search */}
        <div className="h-9 w-36 bg-zinc-100 rounded-lg" />
        {/* Submit */}
        <div className="h-9 w-20 bg-zinc-100 rounded-lg" />
      </div>

      {/* Status tab strip: All / Pending / Confirmed / Cancelled / Visited */}
      <div className="flex gap-1 mb-4 bg-zinc-100 p-1 rounded-lg w-fit">
        {[56, 72, 80, 72, 60].map((w, i) => (
          <div
            key={i}
            className={`h-8 rounded-md bg-zinc-200 ${i === 0 ? 'bg-white shadow-sm' : ''}`}
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Reservations table card */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        {/* Table header */}
        <div className="bg-zinc-50 border-b border-zinc-100 flex gap-4 px-4 py-3">
          {[72, 80, 96, 28, 68, 80, 64].map((w, i) => (
            <div key={i} className="h-3 bg-zinc-100 rounded" style={{ width: w }} />
          ))}
        </div>

        {/* Table rows — alternating bg to mirror odd/even styling */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 px-4 py-4 border-b border-zinc-100 last:border-0 items-start ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}
          >
            {/* Date/time (stacked) */}
            <div>
              <div className="h-3.5 w-20 bg-zinc-100 rounded mb-1.5" />
              <div className="h-2.5 w-12 bg-zinc-100 rounded" />
            </div>
            {/* Venue */}
            <div className="h-3.5 w-28 bg-zinc-100 rounded" />
            {/* Guest name + email */}
            <div>
              <div className="h-3.5 w-28 bg-zinc-100 rounded mb-1.5" />
              <div className="h-2.5 w-36 bg-zinc-100 rounded" />
            </div>
            {/* People */}
            <div className="h-3.5 w-6 bg-zinc-100 rounded" />
            {/* Status badge */}
            <div className="h-5 w-20 bg-zinc-100 rounded-full" />
            {/* Note */}
            <div className="h-3.5 w-24 bg-zinc-100 rounded" />
            {/* Actions: edit button + status buttons + note form */}
            <div className="flex flex-col gap-1.5">
              <div className="h-7 w-14 bg-zinc-100 rounded-lg" />
              <div className="flex gap-1.5">
                <div className="h-7 w-16 bg-zinc-100 rounded-lg" />
                <div className="h-7 w-14 bg-zinc-100 rounded-lg" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-7 w-24 bg-zinc-100 rounded-md" />
                <div className="h-7 w-12 bg-zinc-100 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination row */}
      <div className="flex justify-between items-center mt-4">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-zinc-100 rounded-lg" />
          <div className="h-8 w-20 bg-zinc-100 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
