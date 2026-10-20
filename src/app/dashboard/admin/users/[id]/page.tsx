"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Power, Shield, Copy, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils/helpers";

type UserRole = "admin" | "doctor" | "patient" | "security_officer" | "receptionist";

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  emailVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivitySummary {
  appointments: { total: number; byStatus: Record<string, number> };
  consultations: { total: number; byStatus: Record<string, number> };
  invoices: {
    total: number;
    totalAmount: number;
    byStatus: Record<string, { count: number; total: number }>;
  };
  aiDiagnoses: number;
}

interface RecentAppointment {
  _id: string;
  dateTime: string;
  status: string;
  type?: string;
}

interface UserDetailResponse {
  user: AdminUser;
  doctorProfile: Record<string, unknown> | null;
  activitySummary: ActivitySummary;
  recentAppointments: RecentAppointment[];
}

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Doctor", value: "doctor" },
  { label: "Patient", value: "patient" },
  { label: "Security Officer", value: "security_officer" },
  { label: "Receptionist", value: "receptionist" },
];

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("patient");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load user");
      const payload = json.data as UserDetailResponse;
      setData(payload);
      setSelectedRole(payload.user.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load user";
      toast({ type: "error", title: "Error", description: message });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRoleChange() {
    if (!data || selectedRole === data.user.role) return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update role");
      toast({ type: "success", title: "Role updated" });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      toast({ type: "error", title: "Error", description: message });
    } finally {
      setSavingRole(false);
    }
  }

  async function handleToggleActive() {
    if (!data) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !data.user.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update status");
      toast({
        type: "success",
        title: data.user.isActive ? "User deactivated" : "User activated",
      });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast({ type: "error", title: "Error", description: message });
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleResetPassword() {
    setResetting(true);
    setResetLink(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to generate reset link");
      setResetLink(json.data.resetLink);
      toast({
        type: "success",
        title: "Reset link generated",
        description: "Valid for 1 hour.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate reset link";
      toast({ type: "error", title: "Error", description: message });
    } finally {
      setResetting(false);
    }
  }

  async function copyResetLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      toast({ type: "success", title: "Copied to clipboard" });
    } catch {
      toast({ type: "error", title: "Copy failed" });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-slate-600">User not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/admin/users")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to users
        </Button>
      </div>
    );
  }

  const { user, activitySummary, recentAppointments, doctorProfile } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/admin/users"
            className="mb-1 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to users
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.isActive ? "success" : "danger"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">{user.role}</Badge>
        </div>
      </div>

      {/* Profile + Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account details and metadata.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">User ID</dt>
                <dd className="font-mono text-xs text-slate-700">{user._id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-700">{user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email verified</dt>
                <dd className="text-slate-700">{formatDate(user.emailVerifiedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last login</dt>
                <dd className="text-slate-700">{formatDate(user.lastLogin)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Updated</dt>
                <dd className="text-slate-700">{formatDate(user.updatedAt)}</dd>
              </div>
            </dl>
            {doctorProfile && (
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Linked doctor profile detected.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin actions
            </CardTitle>
            <CardDescription>Mutating actions are audited.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select
                label="Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                options={ROLE_OPTIONS}
              />
              <Button
                className="mt-2 w-full"
                size="sm"
                onClick={handleRoleChange}
                disabled={savingRole || selectedRole === user.role}
                loading={savingRole}
              >
                Save role
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <Button
                variant={user.isActive ? "danger" : "success"}
                size="sm"
                className="w-full"
                onClick={handleToggleActive}
                loading={togglingActive}
                disabled={togglingActive}
              >
                <Power className="mr-2 h-4 w-4" />
                {user.isActive ? "Deactivate user" : "Activate user"}
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleResetPassword}
                loading={resetting}
                disabled={resetting}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Generate reset link
              </Button>
              {resetLink && (
                <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
                  <p className="font-medium text-amber-900">
                    Send this link to the user (expires in 1 hour):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-white px-2 py-1 text-amber-900">
                      {resetLink}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyResetLink}
                      aria-label="Copy reset link"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Appointments"
          value={activitySummary.appointments.total.toString()}
        />
        <SummaryCard
          label="Consultations"
          value={activitySummary.consultations.total.toString()}
        />
        <SummaryCard
          label="Invoices"
          value={activitySummary.invoices.total.toString()}
          sub={formatCurrency(activitySummary.invoices.totalAmount)}
        />
        <SummaryCard
          label="AI diagnoses"
          value={activitySummary.aiDiagnoses.toString()}
        />
      </div>

      {/* Recent appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
          <CardDescription>Last 5 appointments involving this user.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">When</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.map((a) => (
                    <tr key={a._id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-700">
                        {formatDate(a.dateTime)}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{a.type || "—"}</td>
                      <td className="py-2">
                        <Badge variant="outline">{a.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}
