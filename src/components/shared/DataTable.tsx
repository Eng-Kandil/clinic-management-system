"use client";

import { TableSkeleton } from "./LoadingSkeleton";
import { Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, rowIndex) => (
              <tr
                key={(item.id as string) ?? (item._id as string) ?? rowIndex}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors duration-200 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-slate-50"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-6 py-4 text-slate-700"
                  >
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as React.ReactNode) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
