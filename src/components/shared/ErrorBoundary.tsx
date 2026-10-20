"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}

export default function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  homeHref = "/",
  homeLabel = "Go Home",
}: ErrorBoundaryProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="mt-6 text-xl font-semibold text-slate-900">{title}</h2>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {description}
        </p>

        {/* Error digest (non-sensitive) */}
        {error.digest && (
          <p className="mt-3 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
