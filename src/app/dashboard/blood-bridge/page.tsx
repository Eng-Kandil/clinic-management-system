"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Droplet,
  Heart,
  Users,
  Activity,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import BloodRequestCard from "@/components/blood-bridge/BloodRequestCard";
import DonorRegistration from "@/components/blood-bridge/DonorRegistration";
import DonorActivity from "@/components/blood-bridge/DonorActivity";
import CompatibilityChart from "@/components/blood-bridge/CompatibilityChart";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BloodRequestData {
  _id: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: "routine" | "urgent" | "emergency";
  status: "open" | "partially_fulfilled" | "fulfilled" | "cancelled";
  hospital: string;
  deadline?: string;
  requestedBy?: { _id?: string; name?: string; email?: string } | string;
  respondedDonors?: Array<{
    donorId: { _id?: string; userId?: { name?: string }; bloodType?: string } | string;
    status: "pending" | "accepted" | "declined" | "donated";
    respondedAt: string;
  }>;
  unitsFulfilled?: number;
  notes?: string;
  createdAt: string;
}

interface DonorData {
  _id: string;
  userId?: { _id?: string; name?: string; email?: string };
  bloodType: string;
  isAvailable: boolean;
  lastDonationDate?: string;
  nextEligibleDate?: string;
  location?: { address?: string; coordinates?: [number, number] };
  healthConditions?: string[];
  donationCount: number;
}

interface StatsData {
  totalDonors: number;
  activeRequests: number;
  livesSaved: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOOD_TYPE_OPTIONS = [
  { label: "All Blood Types", value: "" },
  { label: "O-", value: "O-" },
  { label: "O+", value: "O+" },
  { label: "A-", value: "A-" },
  { label: "A+", value: "A+" },
  { label: "B-", value: "B-" },
  { label: "B+", value: "B+" },
  { label: "AB-", value: "AB-" },
  { label: "AB+", value: "AB+" },
];

const URGENCY_OPTIONS = [
  { label: "All Urgencies", value: "" },
  { label: "Routine", value: "routine" },
  { label: "Urgent", value: "urgent" },
  { label: "Emergency", value: "emergency" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Partially Fulfilled", value: "partially_fulfilled" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function BloodBridgePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<BloodRequestData[]>([]);
  const [myDonor, setMyDonor] = useState<DonorData | null>(null);
  const [myMatchedRequests, setMyMatchedRequests] = useState<BloodRequestData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalDonors: 0,
    activeRequests: 0,
    livesSaved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [donorLoading, setDonorLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch blood requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (bloodTypeFilter) params.set("bloodType", bloodTypeFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/blood-bridge/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [bloodTypeFilter, urgencyFilter, statusFilter]);

  // Fetch my donor profile
  const fetchMyDonor = useCallback(async () => {
    setDonorLoading(true);
    try {
      const res = await fetch("/api/blood-bridge/donors?myProfile=true&limit=1");
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setMyDonor(json.data[0]);
      } else {
        setMyDonor(null);
      }
    } catch {
      setMyDonor(null);
    } finally {
      setDonorLoading(false);
    }
  }, []);

  // Fetch stats (derived from data)
  const fetchStats = useCallback(async () => {
    try {
      const [donorsRes, requestsRes] = await Promise.all([
        fetch("/api/blood-bridge/donors?limit=1"),
        fetch("/api/blood-bridge/requests?limit=1"),
      ]);
      const donorsJson = await donorsRes.json();
      const requestsJson = await requestsRes.json();

      setStats({
        totalDonors: donorsJson.pagination?.total || 0,
        activeRequests:
          requestsJson.data?.filter(
            (r: BloodRequestData) =>
              r.status === "open" || r.status === "partially_fulfilled"
          ).length || 0,
        livesSaved: requestsJson.pagination?.total
          ? Math.floor(requestsJson.pagination.total * 0.7)
          : 0,
      });
    } catch {
      // Keep defaults
    }
  }, []);

  // Fetch matched requests for activity tab
  const fetchMyMatchedRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/blood-bridge/requests?limit=50");
      const json = await res.json();
      if (json.success && json.data) {
        // Filter for requests where the current donor is matched
        if (myDonor) {
          const matched = json.data.filter((req: BloodRequestData) =>
            req.respondedDonors?.some((d) => {
              const donorId =
                typeof d.donorId === "object" ? d.donorId._id : d.donorId;
              return donorId === myDonor._id;
            })
          );
          setMyMatchedRequests(matched);
        }
      }
    } catch {
      setMyMatchedRequests([]);
    }
  }, [myDonor]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchRequests(), 300);
    return () => clearTimeout(timeout);
  }, [fetchRequests]);

  useEffect(() => {
    fetchMyDonor();
    fetchStats();
  }, [fetchMyDonor, fetchStats]);

  useEffect(() => {
    if (myDonor) {
      fetchMyMatchedRequests();
    }
  }, [myDonor, fetchMyMatchedRequests]);

  // Handle donor registration
  async function handleDonorRegister(data: {
    bloodType: string;
    address: string;
    contactPhone: string;
    contactPreference: string;
    medicalConditions: string;
    isAvailable: boolean;
    lastDonationDate: string;
    weight: string;
    dateOfBirth: string;
  }) {
    setSubmitLoading(true);
    try {
      const payload = {
        bloodType: data.bloodType,
        dateOfBirth: data.dateOfBirth
          ? new Date(data.dateOfBirth).toISOString()
          : undefined,
        weight: data.weight ? parseFloat(data.weight) : 50,
        lastDonationDate: data.lastDonationDate
          ? new Date(data.lastDonationDate).toISOString()
          : undefined,
        medicalConditions: data.medicalConditions
          ? data.medicalConditions
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
        contactPhone: data.contactPhone || "N/A",
        isAvailable: data.isAvailable,
        address: data.address,
        location: {
          type: "Point" as const,
          coordinates: [0, 0] as [number, number],
          address: data.address || "",
        },
      };

      const res = await fetch("/api/blood-bridge/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        await fetchMyDonor();
        await fetchStats();
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  // Handle donor profile update
  async function handleDonorUpdate(data: Partial<{
    bloodType: string;
    address: string;
    contactPhone: string;
    contactPreference: string;
    medicalConditions: string;
    isAvailable: boolean;
    lastDonationDate: string;
    weight: string;
    dateOfBirth: string;
  }>) {
    if (!myDonor) return;
    setSubmitLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (data.bloodType) payload.bloodType = data.bloodType;
      if (typeof data.isAvailable === "boolean")
        payload.isAvailable = data.isAvailable;
      if (data.address) {
        payload.location = {
          type: "Point",
          coordinates: [0, 0],
          address: data.address,
        };
      }
      if (data.lastDonationDate) {
        payload.lastDonationDate = new Date(
          data.lastDonationDate
        ).toISOString();
      }
      if (data.medicalConditions) {
        payload.healthConditions = data.medicalConditions
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const res = await fetch(`/api/blood-bridge/donors/${myDonor._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        await fetchMyDonor();
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  // Handle responding to a blood request
  async function handleRespondToRequest(requestId: string) {
    try {
      const res = await fetch(
        `/api/blood-bridge/requests/${requestId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: "accepted" }),
        }
      );

      if (res.ok) {
        await fetchRequests();
        await fetchMyMatchedRequests();
      }
    } catch {
      // Handle error silently
    }
  }

  // Get donor status for a request
  function getDonorStatusForRequest(
    request: BloodRequestData
  ): "pending" | "accepted" | "declined" | "donated" | null {
    if (!myDonor) return null;
    const match = request.respondedDonors?.find((d) => {
      const id = typeof d.donorId === "object" ? d.donorId._id : d.donorId;
      return id === myDonor._id;
    });
    return match?.status || null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-800 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        {/* Background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white" />
          <div className="absolute bottom-12 right-24 h-20 w-20 rounded-full bg-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Droplet className="h-6 w-6 fill-white text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Blood Bridge</h1>
              <p className="text-red-100 text-sm">
                Connecting donors with those in need
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-red-200" />
              </div>
              <p className="text-2xl font-bold">{stats.totalDonors}</p>
              <p className="text-xs text-red-200">Registered Donors</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Activity className="h-4 w-4 text-red-200" />
              </div>
              <p className="text-2xl font-bold">{stats.activeRequests}</p>
              <p className="text-xs text-red-200">Active Requests</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Heart className="h-4 w-4 text-red-200" />
              </div>
              <p className="text-2xl font-bold">{stats.livesSaved}</p>
              <p className="text-xs text-red-200">Lives Impacted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => router.push("/dashboard/blood-bridge/request")}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Blood Request
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const el = document.getElementById("compatibility-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <TrendingUp className="mr-1.5 h-4 w-4" />
          Compatibility Chart
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="requests"
        tabs={[
          {
            label: "Blood Requests",
            value: "requests",
            content: (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    options={BLOOD_TYPE_OPTIONS}
                    value={bloodTypeFilter}
                    onChange={(e) => setBloodTypeFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select
                    options={URGENCY_OPTIONS}
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-44"
                  />
                  {(bloodTypeFilter || urgencyFilter || statusFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBloodTypeFilter("");
                        setUrgencyFilter("");
                        setStatusFilter("");
                      }}
                    >
                      <Filter className="mr-1.5 h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Request cards */}
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <EmptyState
                    icon={Droplet}
                    title="No blood requests found"
                    description="No requests match your current filters. Create a new request if you need blood."
                    action={{
                      label: "Create Request",
                      href: "/dashboard/blood-bridge/request",
                    }}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {requests.map((req) => (
                      <BloodRequestCard
                        key={req._id}
                        request={req}
                        isDonor={!!myDonor}
                        donorStatus={getDonorStatusForRequest(req)}
                        onRespond={handleRespondToRequest}
                        onViewDetails={(id) =>
                          router.push(`/dashboard/blood-bridge?requestId=${id}`)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Donor Registration",
            value: "registration",
            content: (
              <div className="mx-auto max-w-2xl">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <DonorRegistration
                    existingDonor={donorLoading ? undefined : myDonor}
                    onSubmit={handleDonorRegister}
                    onUpdate={handleDonorUpdate}
                    loading={submitLoading}
                  />
                </div>
              </div>
            ),
          },
          {
            label: "My Activity",
            value: "activity",
            content: (
              <DonorActivity
                donor={donorLoading ? null : myDonor}
                matchedRequests={myMatchedRequests.map((req) => ({
                  _id: req._id,
                  bloodType: req.bloodType,
                  hospital: req.hospital,
                  urgency: req.urgency,
                  status: req.status,
                  unitsNeeded: req.unitsNeeded,
                  deadline: req.deadline,
                  donorStatus: getDonorStatusForRequest(req) || undefined,
                }))}
                onRespondToRequest={handleRespondToRequest}
                onViewRequest={(id) =>
                  router.push(`/dashboard/blood-bridge?requestId=${id}`)
                }
                loading={donorLoading}
              />
            ),
          },
        ]}
      />

      {/* Compatibility Chart section */}
      <div id="compatibility-section" className="scroll-mt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Droplet className="h-5 w-5 text-red-600 fill-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Blood Type Compatibility
              </h2>
              <p className="text-sm text-slate-500">
                Interactive guide to blood type compatibility
              </p>
            </div>
          </div>
          <CompatibilityChart />
        </div>
      </div>
    </div>
  );
}
