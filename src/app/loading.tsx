import { Activity } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      {/* Branded loader */}
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo */}
        <div className="relative">
          {/* Outer ring */}
          <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full bg-blue-100 opacity-40" />
          {/* Logo */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200">
            <Activity className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">Loading ClinicOS</p>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
