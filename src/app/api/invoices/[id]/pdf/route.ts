import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Invoice } from "@/lib/db/models/Invoice";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// GET /api/invoices/[id]/pdf — Render invoice as an HTML document (DEMO MODE)
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;

  const invoice = await Invoice.findById(id)
    .populate({
      path: "patientId",
      populate: { path: "userId", model: "User", select: "name email" },
    })
    .lean()
    .catch(() => null);

  if (!invoice) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const inv = invoice as typeof invoice & {
    _id: string;
    invoiceNumber: string;
    createdAt: Date;
    status: string;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;
    patientId?: { userId?: { name?: string; email?: string } };
    paidAt?: Date;
    paymentMethod?: string;
    notes?: string;
  };

  const patientName = inv.patientId?.userId?.name ?? "Patient";
  const patientEmail = inv.patientId?.userId?.email ?? "";

  const itemRows = (inv.items ?? []).map(
    (item) =>
      `<tr>
        <td>${item.description ?? "Service"}</td>
        <td class="center">${item.quantity ?? 1}</td>
        <td class="right">${formatCurrency(item.unitPrice ?? 0)}</td>
        <td class="right">${formatCurrency(item.total ?? 0)}</td>
      </tr>`
  ).join("");

  const formatPaymentMethod = (method?: string) => {
    if (!method) return "N/A";
    return method
      .replace(/^mock_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${inv.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 24px;
      color: #1e293b;
      font-size: 14px;
      line-height: 1.5;
    }
    .demo-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #334155;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .clinic-name { font-size: 22px; font-weight: bold; color: #0f172a; }
    .clinic-info { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #0f172a; text-align: right; }
    .invoice-meta { font-size: 12px; color: #64748b; text-align: right; margin-top: 8px; line-height: 1.8; }
    .invoice-meta strong { color: #0f172a; }
    .bill-to { margin-bottom: 24px; }
    .bill-to h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    .bill-to .name { font-size: 16px; font-weight: 600; }
    .bill-to .email { font-size: 13px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead tr { background: #1e293b; color: #fff; }
    thead th { padding: 10px 14px; text-align: left; font-weight: 500; font-size: 13px; }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: right; }
    tbody tr:nth-child(odd) { background: #f8fafc; }
    tbody tr:nth-child(even) { background: #fff; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
    .totals-table { width: 260px; }
    .totals-table td { padding: 5px 0; font-size: 13px; color: #475569; }
    .totals-table td:last-child { text-align: right; }
    .totals-table tr.total-row td { border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 16px; font-weight: bold; color: #0f172a; }
    .paid-badge {
      margin-top: 20px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 13px;
      color: #166534;
    }
    .notes { margin-top: 20px; background: #f8fafc; border-radius: 6px; padding: 12px 16px; }
    .notes h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; font-size: 11px; color: #94a3b8; }
    .footer .demo-note { color: #b45309; font-weight: 600; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="demo-badge">&#9888; DEMO MODE &mdash; Not a real invoice</div>

  <div class="header">
    <div>
      <div class="clinic-name">ClinicOS</div>
      <div class="clinic-info">
        billing@clinicos.com<br />
        +1 (555) 000-1234<br />
        123 Medical Center Drive<br />
        Healthcare City, HC 12345
      </div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <strong>Invoice #:</strong> ${inv.invoiceNumber}<br />
        <strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}<br />
        <strong>Status:</strong> ${(inv.status ?? "pending").toUpperCase()}
      </div>
    </div>
  </div>

  <div class="bill-to">
    <h3>Bill To</h3>
    <div class="name">${patientName}</div>
    ${patientEmail ? `<div class="email">${patientEmail}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="center">Qty</th>
        <th class="right">Unit Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td>${formatCurrency(inv.subtotal ?? 0)}</td>
      </tr>
      ${(inv.discount ?? 0) > 0 ? `<tr><td style="color:#16a34a">Discount</td><td style="color:#16a34a">-${formatCurrency(inv.discount ?? 0)}</td></tr>` : ""}
      <tr>
        <td>Tax</td>
        <td>${formatCurrency(inv.tax ?? 0)}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td>${formatCurrency(inv.total ?? 0)}</td>
      </tr>
    </table>
  </div>

  ${inv.status === "paid" ? `
  <div class="paid-badge">
    <strong>&#10003; Payment Received</strong><br />
    Method: ${formatPaymentMethod(inv.paymentMethod ?? undefined)}
    ${inv.paidAt ? ` &mdash; Paid: ${new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
  </div>` : ""}

  ${inv.notes ? `
  <div class="notes">
    <h4>Notes</h4>
    <p>${inv.notes}</p>
  </div>` : ""}

  <div class="footer">
    <p>Thank you for your trust in ClinicOS. This invoice was generated electronically.</p>
    <p class="demo-note">&#9888; DEMO MODE &mdash; This is a simulated invoice. No real payment has been processed.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="invoice-${inv.invoiceNumber}.html"`,
    },
  });
}
