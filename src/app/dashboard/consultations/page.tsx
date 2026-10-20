"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Phone,
  Stethoscope,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import ConsultationCard from "@/components/consultation/ConsultationCard";

interface ConsultationRow {
  _id: string;
  type: "chat" | "voice" | "video";
  status: "waiting" | "active" | "ended";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  summary?: string;
  patientId?: {
    _id: string;
    userId?: string;
    user?: { name: string; avatar?: string };
  };
  doctorId?: {
    _id: string;
    userId?: string;
    specialization?: string;
    user?: { name: string; avatar?: string };
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Fetch current session to determine role
async function fetchSession(): Promise<{
  id: string;
  role: "admin" | "doctor" | "patient" | "security_officer";
  name: string;
} | null> {
  try {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export default function ConsultationsPage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<
    "admin" | "doctor" | "patient" | "security_officer"
  >("patient");
  const [activeTab, setActiveTab] = useState("active");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch user session on mount
  useEffect(() => {
    fetchSession().then((user) => {
      if (user) setUserRole(user.role);
    });
  }, []);

  const fetchConsultations = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");

        // Filter by tab
        if (activeTab === "active") {
          params.set("status", "active");
        } else if (activeTab === "waiting") {
          params.set("status", "waiting");
        } else if (activeTab === "ended") {
          params.set("status", "ended");
        }

        const res = await fetch(`/api/consultations?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setConsultations(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        } else {
          setConsultations([]);
        }
      } catch {
        setConsultations([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchConsultations(1);
  }, [fetchConsultations]);

  // Stats counters
  const activeCount = consultations.length;

  const renderConsultationList = () => {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (consultations.length === 0) {
      const emptyConfig: Record<
        string,
        { title: string; description: string }
      > = {
        active: {
          title: "No active consultations",
          description:
            "You don't have any consultations in progress right now.",
        },
        waiting: {
          title: "No waiting consultations",
          description:
            "There are no consultations in the waiting queue.",
        },
        ended: {
          title: "No completed consultations",
          description:
            "You haven't completed any consultations yet.",
        },
      };

      const config = emptyConfig[activeTab] || emptyConfig.active!;

      return (
        <EmptyState
          icon={Stethoscope}
          title={config.title}
          description={config.description}
        />
      );
    }

    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {consultations.map((c) => (
            <ConsultationCard
              key={c._id}
              consultation={c}
              userRole={userRole}
            />
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}{" "}
              of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => fetchConsultations(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => fetchConsultations(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your real-time consultations with{" "}
            {userRole === "patient" ? "doctors" : "patients"}
          </p>
        </div>
        {(userRole === "patient" || userRole === "admin") && (
          <Button onClick={() => router.push("/dashboard/appointments")}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Consultation
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {activeTab === "active" ? activeCount : "-"}
            </p>
            <p className="text-xs text-slate-500">Active Now</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">Chat</p>
            <p className="text-xs text-slate-500">Text consultations</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">Voice</p>
            <p className="text-xs text-slate-500">Voice call consultations</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            label: "Active",
            value: "active",
            content: renderConsultationList(),
          },
          {
            label: "Waiting",
            value: "waiting",
            content: renderConsultationList(),
          },
          {
            label: "Completed",
            value: "ended",
            content: renderConsultationList(),
          },
        ]}
        defaultValue="active"
        onChange={(value) => setActiveTab(value)}
      />
    </div>
  );
}
