"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  Calendar,
  Pill,
  CreditCard,
  MessageSquare,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";

interface NotificationItem {
  _id: string;
  type: "appointment" | "prescription" | "billing" | "system" | "chat";
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  hasNext: boolean;
  total: number;
}

const TYPE_ICON: Record<NotificationItem["type"], React.ReactNode> = {
  appointment: <Calendar className="h-4 w-4 text-blue-600" />,
  prescription: <Pill className="h-4 w-4 text-emerald-600" />,
  billing: <CreditCard className="h-4 w-4 text-amber-600" />,
  chat: <MessageSquare className="h-4 w-4 text-violet-600" />,
  system: <Info className="h-4 w-4 text-slate-500" />,
};

function formatWhen(iso: string): string {
  const then = new Date(iso);
  const diff = Math.max(0, Date.now() - then.getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const unreadCount = items.filter((n) => !n.readAt).length;

  const fetchPage = useCallback(async (page: number) => {
    const res = await fetch(`/api/notifications?page=${page}&limit=20`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.success) {
      setItems((prev) =>
        page === 1 ? json.data || [] : [...prev, ...(json.data || [])]
      );
      if (json.pagination) setPagination(json.pagination);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPage(1).finally(() => setLoading(false));
  }, [fetchPage]);

  const markOneRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n._id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      /* optimistic */
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      /* optimistic */
    }
  };

  const loadMore = async () => {
    if (!pagination?.hasNext) return;
    setLoadingMore(true);
    try {
      await fetchPage(pagination.page + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Appointment confirmations, prescriptions, and messages will show up here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {items.map((n) => {
            const isUnread = !n.readAt;
            const inner = (
              <div
                className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50 ${
                  isUnread ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  {TYPE_ICON[n.type] ?? TYPE_ICON.system}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatWhen(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markOneRead(n._id);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Check className="h-3 w-3" />
                      Mark as read
                    </button>
                  )}
                </div>
                {isUnread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </div>
            );
            return (
              <div key={n._id} className="border-b border-slate-100 last:border-0">
                {n.link ? (
                  <Link
                    href={n.link}
                    className="block"
                    onClick={() => isUnread && markOneRead(n._id)}
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}

          {pagination?.hasNext && (
            <div className="border-t border-slate-100 p-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                loading={loadingMore}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
