"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  Download,
  ArrowLeft,
  Filter,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import AuditLogTable from "@/components/security/AuditLogTable";
import ChainVerification from "@/components/security/ChainVerification";

// ── Types ────────────────────────────────────────────────────

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AuditLogRow {
  _id: string;
  userId:
    | { _id: string; name: string; email: string; role?: string; avatar?: string }
    | string;
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

// ── Filter options ───────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { label: "All Severities", value: "" },
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

const ACTION_OPTIONS = [
  { label: "All Actions", value: "" },
  { label: "Login", value: "LOGIN" },
  { label: "Login Failed", value: "LOGIN_FAILED" },
  { label: "Logout", value: "LOGOUT" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
  { label: "View", value: "VIEW" },
  { label: "Export", value: "EXPORT" },
  { label: "Create Appointment", value: "CREATE_APPOINTMENT" },
  { label: "Update Appointment", value: "UPDATE_APPOINTMENT" },
  { label: "Create Prescription", value: "CREATE_PRESCRIPTION" },
];

const RESOURCE_OPTIONS = [
  { label: "All Resources", value: "" },
  { label: "User", value: "User" },
  { label: "Patient", value: "Patient" },
  { label: "Appointment", value: "Appointment" },
  { label: "Medical Record", value: "MedicalRecord" },
  { label: "Prescription", value: "Prescription" },
  { label: "Invoice", value: "Invoice" },
  { label: "Consultation", value: "Consultation" },
  { label: "Blood Request", value: "BloodRequest" },
];

// ── Main Page ────────────────────────────────────────────────

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-slate-500">Loading audit log...</div>}>
      <AuditLogContent />
    </Suspense>
  );
}

function AuditLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [severity, setSeverity] = useState("");
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);
  const [showChainVerify, setShowChainVerify] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters =
    search || severity || action || resource || dateFrom || dateTo;

  // ── Fetch logs ─────────────────────────────────────────────

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);

        if (search) params.set("search", search);
        if (severity) params.set("severity", severity);
        if (action) params.set("action", action);
        if (resource) params.set("resource", resource);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/audit-log?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setLogs(json.data ?? []);
          if (json.pagination) setPagination(json.pagination);
        } else {
          setLogs([]);
        }
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [search, severity, action, resource, dateFrom, dateTo, sortBy, sortOrder]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchLogs(1), 250);
    return () => clearTimeout(timeout);
  }, [fetchLogs]);

  // ── Handlers ───────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSeverity("");
    setAction("");
    setResource("");
    setDateFrom("");
    setDateTo("");
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all records (up to 1000) for export
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "1000");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (search) params.set("search", search);
      if (severity) params.set("severity", severity);
      if (action) params.set("action", action);
      if (resource) params.set("resource", resource);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/audit-log?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        const rows = json.data as AuditLogRow[];
        const headers = [
          "Timestamp",
          "User",
          "Email",
          "Action",
          "Resource",
          "Severity",
          "IP Address",
          "Details",
        ];

        const csvRows = rows.map((log) => {
          const user =
            typeof log.userId === "object"
              ? log.userId
              : { name: "System", email: "" };
          return [
            new Date(log.createdAt).toISOString(),
            user?.name ?? "System",
            user?.email ?? "",
            log.action,
            log.resource,
            log.severity,
            log.ipAddress,
            `"${(log.details || "").replace(/"/g, '""')}"`,
          ].join(",");
        });

        const csv = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // export error — silently fail
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/security")}
            className="text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700">
              <FileSearch className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Audit Log
              </h1>
              <p className="text-sm text-slate-500">
                Detailed event history with tamper-evident hash chain
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChainVerify(!showChainVerify)}
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Verify Chain
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            loading={exporting}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Chain Verification (collapsible) */}
      {showChainVerify && (
        <div className="rounded-2xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-800">
          <ChainVerification />
        </div>
      )}

      {/* Dark-themed panel */}
      <div className="rounded-2xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-800">
        {/* Search + Filter Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FileSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, resources, details..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-slate-600 text-slate-300 hover:bg-slate-800 ${
                hasActiveFilters ? "border-blue-500/50 text-blue-400" : ""
              }`}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                  {[severity, action, resource, dateFrom, dateTo].filter(
                    Boolean
                  ).length}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Resource
              </label>
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {RESOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {loading ? (
              "Loading..."
            ) : (
              <>
                Showing{" "}
                <span className="text-slate-300">
                  {logs.length > 0
                    ? `${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}`
                    : "0"}
                </span>{" "}
                of{" "}
                <span className="text-slate-300">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                entries
              </>
            )}
          </p>
          {/* Active severity counts */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield className="h-3 w-3 text-blue-400" /> Info
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield className="h-3 w-3 text-amber-400" /> Warning
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield className="h-3 w-3 text-red-400" /> Critical
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4">
          <AuditLogTable
            logs={logs}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-6 py-3">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (
                      pagination.page >= pagination.totalPages - 2
                    ) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchLogs(pageNum)}
                        className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                          pageNum === pagination.page
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
