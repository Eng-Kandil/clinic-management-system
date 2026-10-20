"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Build page numbers to show (max 5 visible)
  const getVisiblePages = (): (number | "ellipsis")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];

    if (page <= 3) {
      pages.push(1, 2, 3, 4, "ellipsis", totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      {/* Info */}
      <p className="text-sm text-slate-500">
        Showing{" "}
        <span className="font-medium text-slate-700">{startItem}</span> to{" "}
        <span className="font-medium text-slate-700">{endItem}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numbers */}
        {visiblePages.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
