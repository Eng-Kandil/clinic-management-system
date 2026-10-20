"use client";

import { useState } from "react";
import {
  FileText,
  ArrowUpDown,
  Eye,
  CreditCard,
  Download,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils/helpers";

export interface InvoiceRow {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  patientId?: {
    _id: string;
    userId?: { name: string; email: string };
  };
}

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  loading?: boolean;
  onViewInvoice: (invoice: InvoiceRow) => void;
  onPayInvoice: (invoice: InvoiceRow) => void;
  showPatientColumn?: boolean;
}

type SortField = "invoiceNumber" | "createdAt" | "total" | "status" | "dueDate";
type SortDir = "asc" | "desc";

// Hoisted to avoid defining a component during render
function SortHeader({
  label,
  field,
  sortField,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  onSort: (field: SortField) => void;
}) {
  return (
    <th className="px-6 py-3.5 font-medium text-slate-600">
      <button
        className="group inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown
          className={`h-3.5 w-3.5 transition-colors ${
            sortField === field
              ? "text-blue-600"
              : "text-slate-300 group-hover:text-slate-400"
          }`}
        />
      </button>
    </th>
  );
}

export default function InvoiceTable({
  invoices,
  onViewInvoice,
  onPayInvoice,
  showPatientColumn = true,
}: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = invoices
    .filter((inv) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.patientId?.userId?.name?.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "invoiceNumber":
          return a.invoiceNumber.localeCompare(b.invoiceNumber) * dir;
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
        case "dueDate":
          return (
            (new Date(a.dueDate).getTime() -
              new Date(b.dueDate).getTime()) *
            dir
          );
        case "total":
          return (a.total - b.total) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        default:
          return 0;
      }
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 shrink-0">DEMO MODE</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <SortHeader label="Invoice #" field="invoiceNumber" sortField={sortField} onSort={handleSort} />
              <SortHeader label="Date" field="createdAt" sortField={sortField} onSort={handleSort} />
              {showPatientColumn && (
                <th className="px-6 py-3.5 font-medium text-slate-600">
                  Patient
                </th>
              )}
              <SortHeader label="Amount" field="total" sortField={sortField} onSort={handleSort} />
              <SortHeader label="Due Date" field="dueDate" sortField={sortField} onSort={handleSort} />
              <SortHeader label="Status" field="status" sortField={sortField} onSort={handleSort} />
              <th className="px-6 py-3.5 font-medium text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={showPatientColumn ? 7 : 6}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      No invoices found
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr
                  key={inv._id}
                  className="border-b border-slate-100 transition-colors hover:bg-blue-50/30 cursor-pointer"
                  onClick={() => onViewInvoice(inv)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(inv.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  {showPatientColumn && (
                    <td className="px-6 py-4 text-slate-700">
                      {inv.patientId?.userId?.name || "N/A"}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(inv.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(inv.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewInvoice(inv);
                        }}
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {["pending", "overdue"].includes(inv.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPayInvoice(inv);
                          }}
                          title="Pay Now"
                        >
                          <CreditCard className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(
                            menuOpenId === inv._id ? null : inv._id
                          );
                        }}
                        title="More"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {menuOpenId === inv._id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                              // Mock download
                              window.alert(
                                `Downloading PDF for ${inv.invoiceNumber}...`
                              );
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
