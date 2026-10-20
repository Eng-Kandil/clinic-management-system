"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/helpers";

export interface PaymentEntry {
  _id: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  method: string;
  transactionId?: string;
  status: string;
  type: "payment" | "refund" | "subscription";
}

interface PaymentHistoryProps {
  payments: PaymentEntry[];
}

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = payments.filter((p) => {
    if (dateFrom && new Date(p.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.date) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "refunded":
        return <ArrowDownRight className="h-4 w-4 text-amber-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMethodIcon = (method: string) => {
    if (method.includes("credit") || method.includes("debit")) {
      return <CreditCard className="h-4 w-4" />;
    }
    if (method.includes("insurance")) {
      return (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }
    return <Receipt className="h-4 w-4" />;
  };

  const formatMethod = (method: string) => {
    return method
      .replace(/^mock_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Receipt className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          No payment history
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">
          Payment transactions will appear here once invoices are paid.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DEMO MODE badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
        <span className="text-xs text-slate-500">All transactions are simulated</span>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="w-36"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="w-36"
        />
        {(dateFrom || dateTo) && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map((payment, i) => (
            <div
              key={payment._id || i}
              className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
            >
              {/* Timeline dot */}
              <div className="relative mt-1 flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    payment.status === "paid" || payment.status === "success"
                      ? "bg-green-50 text-green-600"
                      : payment.status === "refunded"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {payment.type === "refund" ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : payment.type === "subscription" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    getMethodIcon(payment.method)
                  )}
                </div>
                {i < filtered.length - 1 && (
                  <div className="absolute top-10 h-[calc(100%-0.25rem)] w-px bg-slate-200" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {payment.type === "refund"
                          ? "Refund"
                          : payment.type === "subscription"
                          ? "Subscription Payment"
                          : "Invoice Payment"}
                      </p>
                      {getStatusIcon(payment.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {payment.invoiceNumber} &middot;{" "}
                      {formatMethod(payment.method)}
                    </p>
                    {payment.transactionId && (
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {payment.transactionId}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        payment.type === "refund"
                          ? "text-amber-600"
                          : "text-slate-900"
                      }`}
                    >
                      {payment.type === "refund" ? "-" : "+"}
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(payment.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
