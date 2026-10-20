"use client";

import {
  FileText,
  Printer,
  Download,
  CreditCard,
  CheckCircle,
  X,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils/helpers";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  patientId?: {
    _id: string;
    userId?: { name: string; email: string; phone?: string };
  };
}

interface InvoiceDetailProps {
  invoice: InvoiceData;
  onClose: () => void;
  onPayNow: () => void;
}

export default function InvoiceDetail({
  invoice,
  onClose,
  onPayNow,
}: InvoiceDetailProps) {
  const isPaid = invoice.status === "paid";
  const canPay = ["pending", "overdue"].includes(invoice.status);

  const handlePrint = () => {
    window.print();
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return "N/A";
    return method
      .replace(/^mock_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 pb-8">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl print:shadow-none print:border-none">
        {/* Close / action bar (hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Invoice {invoice.invoiceNumber}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.alert(
                  `Downloading PDF for ${invoice.invoiceNumber}...`
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
            {canPay && (
              <Button size="sm" onClick={onPayNow}>
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Pay Now
              </Button>
            )}
            <button
              onClick={onClose}
              className="ml-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Clinic Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-900">
                  ClinicOS
                </h1>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  billing@clinicos.com
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  +1 (555) 000-1234
                </p>
                <p>123 Medical Center Drive</p>
                <p>Healthcare City, HC 12345</p>
              </div>
            </div>

            {/* Invoice meta */}
            <div className="text-right">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                INVOICE
              </h2>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="text-slate-400">Invoice #:</span>{" "}
                  <span className="font-medium text-slate-900">
                    {invoice.invoiceNumber}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Date:</span>{" "}
                  {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p>
                  <span className="text-slate-400">Due Date:</span>{" "}
                  <span
                    className={
                      invoice.status === "overdue"
                        ? "font-medium text-red-600"
                        : ""
                    }
                  >
                    {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="my-6 h-px bg-gradient-to-r from-blue-200 via-slate-200 to-transparent" />

          {/* Bill To */}
          <div className="mb-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bill To
            </h3>
            <p className="text-lg font-semibold text-slate-900">
              {invoice.patientId?.userId?.name || "Patient"}
            </p>
            {invoice.patientId?.userId?.email && (
              <p className="text-sm text-slate-500">
                {invoice.patientId.userId.email}
              </p>
            )}
          </div>

          {/* Line items table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-6 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-6 py-3 text-center font-medium">Qty</th>
                  <th className="px-6 py-3 text-right font-medium">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-6 py-3 text-slate-800">
                      {item.description}
                    </td>
                    <td className="px-6 py-3 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {(invoice.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment info if paid */}
          {isPaid && (
            <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">
                    Payment Received
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-green-700">
                    <span>
                      Method:{" "}
                      {formatPaymentMethod(invoice.paymentMethod)}
                    </span>
                    {invoice.paidAt && (
                      <span>
                        Paid:{" "}
                        {new Date(invoice.paidAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Notes
              </h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            <p>Thank you for your trust in ClinicOS.</p>
            <p className="mt-0.5">
              This invoice was generated electronically and is valid without a
              signature.
            </p>
            <p className="mt-2 text-yellow-600 font-medium">
              &#9888; DEMO MODE — This is a simulated invoice. No real payment has been processed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
