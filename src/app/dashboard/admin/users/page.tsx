"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Stethoscope,
  Heart,
  Download,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import SearchInput from "@/components/shared/SearchInput";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import UserTable, { type UserRow } from "@/components/admin/UserTable";
import UserModal, {
  type CreateUserFormData,
  type EditUserFormData,
  type UserModalUser,
} from "@/components/admin/UserModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface MetaData {
  roleCounts: Record<string, number>;
  activeCounts: {
    active: number;
    inactive: number;
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [meta, setMeta] = useState<MetaData>({
    roleCounts: {},
    activeCounts: { active: 0, inactive: 0 },
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalUser, setModalUser] = useState<UserModalUser | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    user: UserRow;
    action: "activate" | "deactivate";
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Bulk action state
  const [bulkLoading, setBulkLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // -------------------------------------------------------------------------
  // Fetch users
  // -------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("includeStats", "true");

      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch users");
      }

      setUsers(json.data.users);
      setPagination(json.data.pagination);
      setMeta(json.data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [status, session, fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [users]);

  // -------------------------------------------------------------------------
  // Sort handler
  // -------------------------------------------------------------------------

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  // -------------------------------------------------------------------------
  // Create / Edit user
  // -------------------------------------------------------------------------

  function handleOpenCreate() {
    setModalMode("create");
    setModalUser(null);
    setModalOpen(true);
  }

  function handleOpenEdit(user: UserRow) {
    setModalMode("edit");
    setModalUser({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    });
    setModalOpen(true);
  }

  async function handleModalSubmit(data: CreateUserFormData | EditUserFormData) {
    try {
      setModalLoading(true);

      if (modalMode === "create") {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to create user");
        }
      } else if (modalUser) {
        const res = await fetch(`/api/admin/users/${modalUser._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update user");
        }
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      // Re-throw so the modal can stay open
      throw err;
    } finally {
      setModalLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Toggle active / deactivate
  // -------------------------------------------------------------------------

  function handleToggleActive(user: UserRow) {
    setConfirmAction({
      user,
      action: user.isActive ? "deactivate" : "activate",
    });
    setConfirmOpen(true);
  }

  async function handleConfirmToggle() {
    if (!confirmAction) return;

    try {
      setConfirmLoading(true);

      const { user, action } = confirmAction;
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: action === "activate" }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || `Failed to ${action} user`);
      }

      setConfirmOpen(false);
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setConfirmLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // View profile (navigates to user detail — for now, opens edit)
  // -------------------------------------------------------------------------

  function handleViewProfile(user: UserRow) {
    handleOpenEdit(user);
  }

  // -------------------------------------------------------------------------
  // Reset password (placeholder — shows confirm)
  // -------------------------------------------------------------------------

  function handleResetPassword(_user: UserRow) {
    // Password reset would typically send a reset email.
    // For now this is a no-op placeholder.
    setError("Password reset functionality is not yet implemented.");
  }

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------

  async function handleBulkAction(action: "activate" | "deactivate") {
    if (selectedIds.size === 0) return;

    try {
      setBulkLoading(true);
      setError(null);

      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: action === "activate" }),
        }).then((res) => res.json())
      );

      await Promise.all(promises);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }

  function handleExport() {
    // Build CSV from current users data
    if (users.length === 0) return;

    const headers = ["Name", "Email", "Role", "Status", "Phone", "Joined", "Last Login"];
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.isActive ? "Active" : "Inactive",
      u.phone ?? "",
      new Date(u.createdAt).toLocaleDateString(),
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const totalUsers = meta.activeCounts.active + meta.activeCounts.inactive;

  // -------------------------------------------------------------------------
  // Loading / unauthorized
  // -------------------------------------------------------------------------

  if (status === "loading") return <PageSkeleton />;
  if (status !== "authenticated" || session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all users, roles, and account status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            className="ml-2 font-medium underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard
          title="Total Users"
          value={totalUsers.toLocaleString()}
          icon={Users}
          description="All registered accounts"
        />
        <StatsCard
          title="Active"
          value={meta.activeCounts.active.toLocaleString()}
          icon={UserCheck}
          description={`${totalUsers > 0 ? Math.round((meta.activeCounts.active / totalUsers) * 100) : 0}% of total`}
        />
        <StatsCard
          title="Doctors"
          value={(meta.roleCounts.doctor ?? 0).toLocaleString()}
          icon={Stethoscope}
          description="Medical staff"
        />
        <StatsCard
          title="Patients"
          value={(meta.roleCounts.patient ?? 0).toLocaleString()}
          icon={Heart}
          description="Registered patients"
        />
        <StatsCard
          title="Admins"
          value={(meta.roleCounts.admin ?? 0).toLocaleString()}
          icon={Shield}
          description="System administrators"
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone..."
          className="flex-1"
        />

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="patient">Patient</option>
          <option value="security_officer">Security Officer</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Bulk Actions Bar (shown when items selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} user{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("activate")}
              disabled={bulkLoading}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("deactivate")}
              disabled={bulkLoading}
            >
              <UserX className="h-3.5 w-3.5" />
              Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <UserTable
        users={users}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={handleOpenEdit}
        onToggleActive={handleToggleActive}
        onViewProfile={handleViewProfile}
        onResetPassword={handleResetPassword}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={setPage}
      />

      {/* User Create/Edit Modal */}
      <UserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        user={modalUser}
        onSubmit={handleModalSubmit}
        loading={modalLoading}
      />

      {/* Confirm Activate/Deactivate Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction?.action === "deactivate"
            ? "Deactivate User"
            : "Activate User"
        }
        description={
          confirmAction?.action === "deactivate"
            ? `Are you sure you want to deactivate ${confirmAction?.user.name}? They will no longer be able to log in.`
            : `Are you sure you want to activate ${confirmAction?.user.name}? They will regain access to their account.`
        }
        confirmLabel={
          confirmAction?.action === "deactivate" ? "Deactivate" : "Activate"
        }
        variant={confirmAction?.action === "deactivate" ? "danger" : "default"}
        onConfirm={handleConfirmToggle}
        loading={confirmLoading}
      />
    </div>
  );
}
