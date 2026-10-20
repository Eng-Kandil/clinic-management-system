export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
      </div>

      {/* Status tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-lg bg-slate-200"
          />
        ))}
      </div>

      {/* Appointment cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
            </div>

            {/* Card body */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                <div className="h-3.5 w-36 animate-pulse rounded bg-slate-200" />
              </div>
            </div>

            {/* Card footer */}
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
              <div className="h-8 w-full animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
