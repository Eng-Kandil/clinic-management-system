"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  MoreVertical,
  Edit,
  UserCheck,
  UserX,
  Eye,
  KeyRound,
  Inbox,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "patient" | "security_officer";
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  _stats?: {
    appointments: number;
    consultations: number;
    invoices: number;
    totalBilled: number;
  };
}

interface UserTableProps {
  users: UserRow[];
  loading?: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEdit: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
  onViewProfile: (user: UserRow) => void;
  onResetPassword: (user: UserRow) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; label: string }> = {
  admin: { variant: "danger", label: "Admin" },
  doctor: { variant: "default", label: "Doctor" },
  patient: { variant: "success", label: "Patient" },
  security_officer: { variant: "warning", label: "Security" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  doctor: "bg-blue-100 text-blue-800",
  patient: "bg-green-100 text-green-800",
  security_officer: "bg-orange-100 text-orange-800",
};

// ---------------------------------------------------------------------------
// SortIcon (hoisted to avoid defining a component during render)
// ---------------------------------------------------------------------------

function SortIcon({
  field,
  sortBy,
  sortOrder,
}: {
  field: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== field) return null;
  return sortOrder === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserTable({
  users,
  loading = false,
  selectedIds,
  onSelectionChange,
  onEdit,
  onToggleActive,
  onViewProfile,
  onResetPassword,
  sortBy,
  sortOrder,
  onSort,
}: UserTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Select all / none
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u._id));
  const someSelected = users.some((u) => selectedIds.has(u._id)) && !allSelected;

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(users.map((u) => u._id)));
    }
  }

  function handleSelectOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm text-slate-500">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {/* Checkbox */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>

              {/* User */}
              <th
                className="cursor-pointer whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                onClick={() => onSort("name")}
              >
                User <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
              </th>

              {/* Role */}
              <th className="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role
              </th>

              {/* Status */}
              <th className="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>

              {/* Joined */}
              <th
                className="cursor-pointer whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                onClick={() => onSort("createdAt")}
              >
                Joined <SortIcon field="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
              </th>

              {/* Last Login */}
              <th
                className="cursor-pointer whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                onClick={() => onSort("lastLogin")}
              >
                Last Login <SortIcon field="lastLogin" sortBy={sortBy} sortOrder={sortOrder} />
              </th>

              {/* Actions */}
              <th className="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr
                key={user._id}
                className={`transition-colors duration-150 ${
                  selectedIds.has(user._id) ? "bg-blue-50/50" : "hover:bg-slate-50"
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user._id)}
                    onChange={() => handleSelectOne(user._id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>

                {/* User info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ROLE_STYLES[user.role]?.label ?? user.role}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        user.isActive ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm text-slate-600">
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </td>

                {/* Joined */}
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>

                {/* Last Login */}
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Never"}
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOpenMenuId(openMenuId === user._id ? null : user._id)
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {openMenuId === user._id && (
                      <>
                        {/* Click-away overlay */}
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setOpenMenuId(null)}
                        />

                        {/* Dropdown menu */}
                        <div className="absolute right-0 z-40 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onViewProfile(user);
                            }}
                          >
                            <Eye className="h-4 w-4 text-slate-400" />
                            View Profile
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onEdit(user);
                            }}
                          >
                            <Edit className="h-4 w-4 text-slate-400" />
                            Edit User
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onToggleActive(user);
                            }}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 text-red-400" />
                                <span className="text-red-600">Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 text-green-500" />
                                <span className="text-green-700">Activate</span>
                              </>
                            )}
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onResetPassword(user);
                            }}
                          >
                            <KeyRound className="h-4 w-4 text-slate-400" />
                            Reset Password
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
