export default function DashboardPageLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Stats cards skeleton (4 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-lg bg-slate-100" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts area skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mb-4 h-3.5 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-slate-50" />
        </div>

        {/* Chart 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mb-4 h-3.5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-slate-50" />
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
