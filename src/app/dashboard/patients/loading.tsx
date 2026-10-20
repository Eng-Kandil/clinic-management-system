export default function PatientsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
      </div>

      {/* Search and filters bar */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="flex gap-4 border-b border-slate-200 px-6 py-4">
          <div className="h-4 w-1/6 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/5 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/6 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/5 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/8 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/8 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0"
          >
            <div className="flex w-1/6 items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-3.5 w-1/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-1/6 animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-1/5 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-9 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
