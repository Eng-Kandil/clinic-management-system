"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils/helpers";

interface InvoiceRow {
  _id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  createdAt: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  patientId?: { _id: string; name?: string; email?: string } | string | null;
}

interface BillingResponse {
  invoices: InvoiceRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalAmount: number; paidAmount: number; outstandingAmount: number };
}

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  refunded: "bg-blue-100 text-blue-700",
};

function patientLabel(p: InvoiceRow["patientId"]): string {
  if (!p) return "—";
  if (typeof p === "string") return p;
  return p.name || p.email || String(p._id);
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/billing?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast({ type: "error", title: "Failed to load invoices", description: json.message });
      }
    } catch {
      toast({ type: "error", title: "Network error" });
    } finally {
      setLoading(false);
    }
  }, [status, from, to, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* DEMO banner */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
        <div>
          <p className="text-sm font-semibold text-yellow-900">Demo billing data</p>
          <p className="text-xs text-yellow-800">
            All invoices and payment methods on this page are simulated and not connected
            to a live payment processor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-slate-700" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Overview</h1>
          <p className="text-sm text-slate-500">Search and review invoices across the platform.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Total billed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {data ? formatCurrency(data.summary.totalAmount) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">
              {data ? formatCurrency(data.summary.paidAmount) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">
              {data ? formatCurrency(data.summary.outstandingAmount) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          />
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
            placeholder="From"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
            placeholder="To"
          />
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <Search className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : !data || data.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{patientLabel(inv.patientId)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[inv.status] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-500">
                Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} invoices
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
