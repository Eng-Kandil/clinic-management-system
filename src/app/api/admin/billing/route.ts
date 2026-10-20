import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { Invoice } from "@/lib/db/models/Invoice";

// ---------------------------------------------------------------------------
// GET /api/admin/billing — Listing of invoices (admin only)
// Query params: status, from (ISO), to (ISO), page, limit
// ---------------------------------------------------------------------------

const ALLOWED_STATUSES = ["pending", "paid", "overdue", "cancelled", "refunded"] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

function isStatus(value: string): value is Status {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), 100);

    const filter: Record<string, unknown> = {};
    if (statusParam && isStatus(statusParam)) filter.status = statusParam;

    if (fromParam || toParam) {
      const range: Record<string, Date> = {};
      if (fromParam) {
        const from = new Date(fromParam);
        if (!Number.isNaN(from.getTime())) range.$gte = from;
      }
      if (toParam) {
        const to = new Date(toParam);
        if (!Number.isNaN(to.getTime())) range.$lte = to;
      }
      if (Object.keys(range).length > 0) filter.createdAt = range;
    }

    const [items, total, totals] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "patientId", select: "name email" })
        .lean(),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total" },
            paidAmount: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] },
            },
            outstandingAmount: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["pending", "overdue"]] },
                  "$total",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summary = totals[0] ?? {
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
    };

    return successResponse({
      invoices: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        outstandingAmount: summary.outstandingAmount,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Billing GET] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
