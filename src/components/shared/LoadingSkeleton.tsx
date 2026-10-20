function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <SkeletonBlock className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-200 px-6 py-4">
        <SkeletonBlock className="h-4 w-1/5" />
        <SkeletonBlock className="h-4 w-1/4" />
        <SkeletonBlock className="h-4 w-1/6" />
        <SkeletonBlock className="h-4 w-1/5" />
        <SkeletonBlock className="h-4 w-1/6" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0"
        >
          <SkeletonBlock className="h-3.5 w-1/5" />
          <SkeletonBlock className="h-3.5 w-1/4" />
          <SkeletonBlock className="h-3.5 w-1/6" />
          <SkeletonBlock className="h-3.5 w-1/5" />
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBlock className="mb-8 h-6 w-1/3" />
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <SkeletonBlock className="h-10 w-24 rounded-lg" />
        <SkeletonBlock className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-36 rounded-lg" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={5} />
    </div>
  );
}
