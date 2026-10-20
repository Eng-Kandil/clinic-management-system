"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { TableSkeleton, CardSkeleton } from "@/components/shared/LoadingSkeleton";
import InvoiceTable, {
  type InvoiceRow,
} from "@/components/billing/InvoiceTable";
import InvoiceDetail from "@/components/billing/InvoiceDetail";
import { toast } from "@/hooks/useToast";
import PaymentHistory, {
  type PaymentEntry,
} from "@/components/billing/PaymentHistory";
import { formatCurrency } from "@/lib/utils/helpers";

// ── Types ────────────────────────────────────────────────────────────────

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface BillingStats {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  invoiceCount: number;
  paidCount: number;
}

// ── Status options ───────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

// ── Stat card component ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor}`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Invoice detail
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(
    null
  );
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment in-flight set (invoice IDs)
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());

  // Billing stats
  const [stats, setStats] = useState<BillingStats>({
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    invoiceCount: 0,
    paidCount: 0,
  });

  // ── Fetch invoices ──────────────────────────────────────────────────

  const fetchInvoices = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "10");
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/billing/invoices?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setInvoices(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        } else {
          setInvoices([]);
        }
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, dateFrom, dateTo]
  );

  // ── Compute stats from ALL invoices (separate call, no status filter) ─

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/invoices?limit=100");
      const json = await res.json();
      if (json.success && json.data) {
        const all = json.data as InvoiceRow[];
        const totalBilled = all.reduce((s, i) => s + i.total, 0);
        const paidInvoices = all.filter((i) => i.status === "paid");
        const totalPaid = paidInvoices.reduce((s, i) => s + i.total, 0);
        const overdueInvoices = all.filter((i) => i.status === "overdue");
        const overdue = overdueInvoices.reduce((s, i) => s + i.total, 0);
        const pendingInvoices = all.filter(
          (i) => i.status === "pending" || i.status === "overdue"
        );
        const outstanding = pendingInvoices.reduce((s, i) => s + i.total, 0);

        setStats({
          totalBilled,
          totalPaid,
          outstanding,
          overdue,
          invoiceCount: all.length,
          paidCount: paidInvoices.length,
        });
      }
    } catch {
      // stats are best-effort
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchInvoices(1);
      fetchStats();
    }, 150);
    return () => clearTimeout(timeout);
  }, [fetchInvoices, fetchStats]);

  // ── View invoice detail ───────────────────────────────────────────────

  const handleViewInvoice = async (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices/${inv._id}`);
      const json = await res.json();
      if (json.success) {
        setDetailData(json.data);
      }
    } catch {
      // stay on list
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedInvoice(null);
    setDetailData(null);
  };

  // ── Pay invoice (DEMO MODE — direct POST, no real processor) ─────────

  const handlePayInvoice = useCallback(
    async (inv: InvoiceRow) => {
      if (payingIds.has(inv._id)) return;
      setPayingIds((prev) => {
        const next = new Set(prev);
        next.add(inv._id);
        return next;
      });
      try {
        const res = await fetch("/api/billing/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: inv._id, method: "card" }),
        });
        const json = await res.json();
        if (json.success) {
          toast({
            type: "success",
            title: "Demo payment successful",
            description: `Invoice ${inv.invoiceNumber} marked as paid (no real charge).`,
          });
          await Promise.all([fetchInvoices(pagination.page), fetchStats()]);
        } else {
          toast({
            type: "error",
            title: "Payment failed",
            description: json.message || "Unable to process demo payment.",
          });
        }
      } catch {
        toast({
          type: "error",
          title: "Network error",
          description: "Could not reach payment endpoint.",
        });
      } finally {
        setPayingIds((prev) => {
          const next = new Set(prev);
          next.delete(inv._id);
          return next;
        });
      }
    },
    [payingIds, fetchInvoices, fetchStats, pagination.page]
  );

  // ── Build payment history from paid invoices ─────────────────────────

  const paymentHistory: PaymentEntry[] = invoices
    .filter((inv) => inv.status === "paid" || inv.status === "refunded")
    .map((inv) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.total,
      date: inv.paidAt || inv.createdAt,
      method: inv.paymentMethod || "N/A",
      status: inv.status,
      type: inv.status === "refunded" ? ("refund" as const) : ("payment" as const),
    }));

  const clearFilters = () => {
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* DEMO MODE banner */}
      <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-300 px-4 py-3 flex items-center gap-2">
        <span className="text-yellow-800 font-semibold">&#9888; DEMO MODE</span>
        <span className="text-yellow-700 text-sm">No real charges. Payments are simulated for demonstration purposes only.</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Billing & Invoices
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage invoices, payments, and billing history
          </p>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Billed"
            value={formatCurrency(stats.totalBilled)}
            icon={DollarSign}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            label="Total Paid"
            value={formatCurrency(stats.totalPaid)}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding)}
            icon={TrendingUp}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(stats.overdue)}
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-50"
          />
        </div>
      )}

      {/* Tabs: Invoices / Payments */}
      <Tabs
        defaultValue="invoices"
        tabs={[
          {
            label: "Invoices",
            value: "invoices",
            content: (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-36"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-36"
                  />
                  {(statusFilter || dateFrom || dateTo) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                    >
                      <Filter className="mr-1.5 h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>

                {loading ? (
                  <TableSkeleton rows={5} />
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <FileText className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">
                      No invoices found
                    </h3>
                    <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                      {statusFilter || dateFrom || dateTo
                        ? "No invoices match your current filters."
                        : "Invoices will appear here once created."}
                    </p>
                  </div>
                ) : (
                  <>
                    <InvoiceTable
                      invoices={invoices}
                      onViewInvoice={handleViewInvoice}
                      onPayInvoice={handlePayInvoice}
                    />

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-3 shadow-sm">
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
                            onClick={() =>
                              fetchInvoices(pagination.page - 1)
                            }
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-slate-700">
                            Page {pagination.page} of{" "}
                            {pagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasNext}
                            onClick={() =>
                              fetchInvoices(pagination.page + 1)
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ),
          },
          {
            label: "Payments",
            value: "payments",
            content: (
              <PaymentHistory payments={paymentHistory} />
            ),
          },
        ]}
      />

      {/* Invoice Detail Overlay */}
      {selectedInvoice && detailData && !detailLoading && (
        <InvoiceDetail
          invoice={detailData as never}
          onClose={handleCloseDetail}
          onPayNow={() => {
            const inv = selectedInvoice;
            handleCloseDetail();
            void handlePayInvoice(inv);
          }}
        />
      )}
    </div>
  );
}
