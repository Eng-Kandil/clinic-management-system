"use client";

import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Dashboard Error"
      description="Something went wrong while loading the dashboard. Please try again or navigate back."
      homeHref="/dashboard"
      homeLabel="Back to Dashboard"
    />
  );
}
