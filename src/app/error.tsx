"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Activity } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      {/* Logo */}
      <Link href="/" className="mb-12 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900">ClinicOS</span>
      </Link>

      {/* Error card */}
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="mt-5 text-xl font-semibold text-slate-900">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>

        {/* Error digest */}
        {error.digest && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
