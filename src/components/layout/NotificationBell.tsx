"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";

interface NotificationItem {
  _id: string;
  type: "appointment" | "prescription" | "billing" | "system" | "chat";
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?summary=true", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        success: boolean;
        data?: { unreadCount: number };
      };
      if (json.success && json.data) {
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Silent — bell is non-critical UI
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?page=1&limit=10", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: NotificationItem[];
      };
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial summary + polling
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Load list when opening
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // Outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markOneRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n._id === id && !n.readAt
          ? { ...n, readAt: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Re-sync on failure
      fetchSummary();
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() }
      )
    );
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      fetchSummary();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Notifications
              </p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No notifications</p>
              </div>
            )}

            {items.map((n) => {
              const isUnread = !n.readAt;
              const Wrapper = ({
                children,
              }: {
                children: React.ReactNode;
              }) =>
                n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => {
                      if (isUnread) markOneRead(n._id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    {children}
                  </Link>
                ) : (
                  <div>{children}</div>
                );

              return (
                <Wrapper key={n._id}>
                  <div
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      isUnread ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          isUnread ? "bg-blue-500" : "bg-transparent"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {n.title}
                          </p>
                          <span className="text-[11px] text-slate-400 flex-shrink-0">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markOneRead(n._id);
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                          >
                            <Check className="w-3 h-3" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
