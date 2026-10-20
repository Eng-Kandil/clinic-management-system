"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  Shield,
  AlertTriangle,
  User as UserIcon,
  Filter,
} from "lucide-react";

interface TimelineEvent {
  _id: string;
  action: string;
  resource: string;
  details: string;
  severity: "info" | "warning" | "critical";
  userId?: { _id: string; name: string; email: string } | null;
  ipAddress?: string;
  createdAt: string;
}

interface SecurityTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const SEVERITY_STYLES = {
  info: {
    dot: "bg-blue-400 ring-blue-400/20",
    line: "bg-blue-400/20",
    label: "text-blue-400",
    bg: "bg-blue-500/5",
  },
  warning: {
    dot: "bg-amber-400 ring-amber-400/20",
    line: "bg-amber-400/20",
    label: "text-amber-400",
    bg: "bg-amber-500/5",
  },
  critical: {
    dot: "bg-red-500 ring-red-500/20",
    line: "bg-red-500/20",
    label: "text-red-400",
    bg: "bg-red-500/5",
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
  return `${days}d ago`;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 animate-pulse rounded-full bg-slate-700" />
            <div className="h-full w-0.5 bg-slate-800" />
          </div>
          <div className="flex-1 space-y-2 pb-6">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-700/50" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SecurityTimeline({ events, loading }: SecurityTimelineProps) {
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "critical">(
    "all"
  );

  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.severity === filter);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-200">
            Recent Events
          </h3>
        </div>

        {/* Quick filter pills */}
        <div className="flex items-center gap-1">
          <Filter className="mr-1 h-3.5 w-3.5 text-slate-500" />
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                filter === f
                  ? f === "critical"
                    ? "bg-red-500/20 text-red-400"
                    : f === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : f === "info"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-slate-600/30 text-slate-300"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TimelineSkeleton />
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Shield className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">
            No events match the current filter
          </p>
        </div>
      ) : (
        <div className="max-h-[500px] space-y-0 overflow-y-auto pr-1">
          {filteredEvents.map((event, idx) => {
            const style = SEVERITY_STYLES[event.severity];
            const isLast = idx === filteredEvents.length - 1;

            return (
              <div key={event._id} className="group flex gap-4">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "mt-1.5 h-3 w-3 flex-shrink-0 rounded-full ring-4",
                      style.dot
                    )}
                  />
                  {!isLast && (
                    <div className={cn("w-0.5 flex-1", style.line)} />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "mb-4 flex-1 rounded-lg border border-transparent p-3 transition-colors hover:border-slate-700/50",
                    style.bg
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                          {event.action}
                        </span>
                        <span className="text-xs text-slate-500">
                          on {event.resource}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                        {event.details}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                        {event.userId && typeof event.userId === "object" && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {event.userId.name}
                          </span>
                        )}
                        {event.severity === "critical" && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-slate-500">
                      {timeAgo(event.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
