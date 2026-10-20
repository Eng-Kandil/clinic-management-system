"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Lock,
  Search,
  Loader2,
  Crown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "@/hooks/useToast";

interface ChatThread {
  _id: string;
  status: "waiting" | "active" | "ended";
  updatedAt: string;
  doctorId?: { user?: { name?: string }; specialization?: string };
}

interface DoctorOption {
  _id: string;
  user?: { name?: string };
  specialization?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);

  const [showPicker, setShowPicker] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [creatingWith, setCreatingWith] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/consultations?type=chat&limit=50", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setThreads(json.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [subRes] = await Promise.all([
          fetch("/api/billing/subscription", { cache: "no-store" }),
          loadThreads(),
        ]);
        const subJson = await subRes.json();
        const sub = subJson?.data?.subscription;
        const isPaid = !!sub && sub.plan !== "free" && sub.isActive !== false;
        setSubscribed(isPaid);
        setPlanName(sub?.plan ?? null);
      } catch {
        setSubscribed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadThreads]);

  const openPicker = async () => {
    setShowPicker(true);
    if (doctors.length === 0) {
      try {
        const res = await fetch("/api/doctors?limit=100", { cache: "no-store" });
        const json = await res.json();
        if (json.success) setDoctors(json.data || []);
      } catch {
        /* ignore */
      }
    }
  };

  const startChat = async (doctorId: string) => {
    setCreatingWith(doctorId);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, type: "chat" }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?._id) {
        router.push(`/dashboard/consultations/${json.data._id}`);
      } else {
        toast({
          type: "error",
          title: "Could not start chat",
          description: json.message || "Please try again.",
        });
      }
    } catch {
      toast({ type: "error", title: "Network error", description: "Please try again." });
    } finally {
      setCreatingWith(null);
    }
  };

  const filteredDoctors = doctors.filter((d) =>
    `${d.user?.name ?? ""} ${d.specialization ?? ""}`
      .toLowerCase()
      .includes(doctorSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Text your doctor directly.
          </p>
        </div>
        {subscribed && (
          <Button onClick={openPicker}>
            <Plus className="mr-1.5 h-4 w-4" />
            New message
          </Button>
        )}
      </div>

      {/* Subscription gate */}
      {!subscribed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Messaging is a subscription feature
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Upgrade to a Basic or Premium plan to text your doctor directly
                between visits.
              </p>
              <Button
                className="mt-3"
                onClick={() => router.push("/dashboard/billing/subscription")}
              >
                <Crown className="mr-1.5 h-4 w-4" />
                Upgrade plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Threads */}
      {threads.length === 0 ? (
        subscribed ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Tap “New message” above to start a chat with one of our doctors."
          />
        ) : null
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {threads.map((t) => {
            const name = t.doctorId?.user?.name
              ? `Dr. ${t.doctorId.user.name}`
              : "Doctor";
            return (
              <button
                key={t._id}
                onClick={() => router.push(`/dashboard/consultations/${t._id}`)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
              >
                <Avatar name={name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {name}
                    </p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {t.doctorId?.specialization || "General"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}

      {subscribed && planName && (
        <p className="text-center text-xs text-slate-400 capitalize">
          {planName} plan active
        </p>
      )}

      {/* Doctor picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative z-50 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-base font-semibold text-slate-900">
                Choose a doctor
              </h2>
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or specialty"
                  className="pl-8"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredDoctors.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No doctors found.
                </p>
              ) : (
                filteredDoctors.map((d) => {
                  const name = d.user?.name ? `Dr. ${d.user.name}` : "Doctor";
                  return (
                    <button
                      key={d._id}
                      onClick={() => startChat(d._id)}
                      disabled={creatingWith !== null}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Avatar name={name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {d.specialization || "General"}
                        </p>
                      </div>
                      {creatingWith === d._id && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-slate-100 p-3 text-right">
              <Button variant="outline" size="sm" onClick={() => setShowPicker(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
