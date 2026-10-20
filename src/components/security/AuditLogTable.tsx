"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowUpDown,
  User as UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditLogUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface AuditLogRow {
  _id: string;
  userId: AuditLogUser | string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  severity: "info" | "warning" | "critical";
  currentHash?: string;
  previousHash?: string;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLogRow[];
  loading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

const SEVERITY_STYLES = {
  info: {
    badge: "info" as const,
    row: "hover:bg-blue-500/5",
    dot: "bg-blue-400",
  },
  warning: {
    badge: "warning" as const,
    row: "hover:bg-amber-500/5",
    dot: "bg-amber-400",
  },
  critical: {
    badge: "danger" as const,
    row: "hover:bg-red-500/5",
    dot: "bg-red-400",
  },
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function formatTimestamp(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function JsonViewer({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="text-slate-500 italic">null</span>;
  }

  return (
    <pre className="max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300 font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-3">
        <div className="flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-slate-700/50"
              style={{ width: `${60 + ((i * 13) % 40)}px` }}
            />
          ))}
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 border-b border-slate-800/50 px-6 py-4 last:border-b-0"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-slate-700/40" />
          <div className="h-3 w-28 animate-pulse rounded bg-slate-700/40" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-700/40" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-700/40" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-700/40" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200"
    >
      {label}
      <ArrowUpDown
        className={cn(
          "h-3 w-3 transition-colors",
          isActive ? "text-blue-400" : "text-slate-600 group-hover:text-slate-400"
        )}
        style={{
          transform:
            isActive && currentOrder === "asc" ? "scaleY(-1)" : undefined,
        }}
      />
    </button>
  );
}

export default function AuditLogTable({
  logs,
  loading,
  sortBy,
  sortOrder,
  onSort,
}: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return <TableSkeleton />;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/50 bg-slate-900/30 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/80">
          <ExternalLink className="h-7 w-7 text-slate-500" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-300">
          No audit logs found
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Try adjusting your filters or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Timestamp"
                  field="createdAt"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  User
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Action"
                  field="action"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Resource"
                  field="resource"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Severity"
                  field="severity"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  IP Address
                </span>
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const severity = SEVERITY_STYLES[log.severity];
              const isExpanded = expandedId === log._id;
              const user =
                typeof log.userId === "object" ? log.userId : null;

              return (
                <tr key={log._id} className="group">
                  {/* Main row */}
                  <td
                    colSpan={7}
                    className="p-0"
                  >
                    <div
                      className={cn(
                        "flex cursor-pointer items-center border-b border-slate-800/50 transition-colors",
                        severity.row,
                        isExpanded && "bg-slate-800/20"
                      )}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : log._id)
                      }
                    >
                      {/* Severity dot */}
                      <div className="w-1 self-stretch">
                        <div
                          className={cn(
                            "h-full w-full",
                            log.severity === "critical" && "bg-red-500",
                            log.severity === "warning" && "bg-amber-500",
                            log.severity === "info" && "bg-blue-500/50"
                          )}
                        />
                      </div>

                      <div className="flex flex-1 items-center min-w-[800px]">
                        {/* Timestamp */}
                        <div className="w-[160px] flex-shrink-0 px-4 py-3">
                          <p className="text-xs font-medium text-slate-300">
                            {timeAgo(log.createdAt)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatTimestamp(log.createdAt)}
                          </p>
                        </div>

                        {/* User */}
                        <div className="w-[160px] flex-shrink-0 px-4 py-3">
                          {user ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700/80 text-xs font-bold text-slate-300">
                                {user.name?.charAt(0)?.toUpperCase() || (
                                  <UserIcon className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-300">
                                  {user.name}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              System
                            </span>
                          )}
                        </div>

                        {/* Action */}
                        <div className="w-[180px] flex-shrink-0 px-4 py-3">
                          <span className="inline-block rounded bg-slate-800/80 px-2 py-0.5 font-mono text-xs text-slate-300">
                            {log.action}
                          </span>
                        </div>

                        {/* Resource */}
                        <div className="w-[140px] flex-shrink-0 px-4 py-3">
                          <span className="text-xs text-slate-400">
                            {log.resource}
                          </span>
                        </div>

                        {/* Severity */}
                        <div className="w-[100px] flex-shrink-0 px-4 py-3">
                          <Badge variant={severity.badge} className="text-[10px] uppercase">
                            {log.severity}
                          </Badge>
                        </div>

                        {/* IP */}
                        <div className="w-[130px] flex-shrink-0 px-4 py-3">
                          <span className="font-mono text-xs text-slate-400">
                            {log.ipAddress}
                          </span>
                        </div>

                        {/* Expand */}
                        <div className="w-10 flex-shrink-0 px-2 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="inline h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="inline h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-b border-slate-700/30 bg-slate-800/20 px-6 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* Details */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                              Details
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">
                              {log.details}
                            </p>
                          </div>

                          {/* User Agent */}
                          {log.userAgent && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                User Agent
                              </p>
                              <p className="mt-1 break-all text-xs text-slate-400">
                                {log.userAgent}
                              </p>
                            </div>
                          )}

                          {/* Resource ID */}
                          {log.resourceId && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Resource ID
                              </p>
                              <p className="mt-1 font-mono text-xs text-slate-400">
                                {log.resourceId}
                              </p>
                            </div>
                          )}

                          {/* Hash Chain */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                              Hash Chain
                            </p>
                            <div className="mt-1 space-y-1">
                              <p className="font-mono text-[10px] text-slate-500 break-all">
                                <span className="text-slate-400">current:</span>{" "}
                                {log.currentHash || "N/A"}
                              </p>
                              <p className="font-mono text-[10px] text-slate-500 break-all">
                                <span className="text-slate-400">prev:</span>{" "}
                                {log.previousHash || "GENESIS"}
                              </p>
                            </div>
                          </div>

                          {/* Metadata */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="md:col-span-2">
                              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                                Metadata
                              </p>
                              <JsonViewer data={log.metadata} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
