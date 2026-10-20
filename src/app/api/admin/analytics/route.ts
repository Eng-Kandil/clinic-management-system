import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";
import { Appointment } from "@/lib/db/models/Appointment";
import { Invoice } from "@/lib/db/models/Invoice";
import { AIDiagnosisModel } from "@/lib/db/models/AIDiagnosis";
import { Consultation } from "@/lib/db/models/Consultation";
import { BloodDonor } from "@/lib/db/models/BloodDonor";
import { BloodRequest } from "@/lib/db/models/BloodRequest";
import { Doctor } from "@/lib/db/models/Doctor";

// ---------------------------------------------------------------------------
// GET /api/admin/analytics — Comprehensive analytics (admin only)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const days = Math.min(Math.max(daysParam, 7), 365);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Run all aggregations in parallel
    const [
      usersByRole,
      userGrowth,
      patientRegistrationByMonth,
      totalUsers,
      appointmentStats,
      appointmentsByStatus,
      appointmentTrend,
      revenueStats,
      revenueByMonth,
      revenueByPaymentMethod,
      aiDiagnosisStats,
      aiByUrgency,
      consultationStats,
      consultationsByType,
      avgConsultationDuration,
      bloodDonorStats,
      bloodRequestStats,
      topDoctors,
    ] = await Promise.all([
      // ── Users by role ───────────────────────────────────────
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),

      // ── User registration growth (last N days, grouped by day) ──
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
      ]),

      // ── Patient registration by month (last 6 months) ───────
      User.aggregate([
        {
          $match: { role: "patient", createdAt: { $gte: sixMonthsAgo } },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            patients: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", patients: 1, _id: 0 } },
      ]),

      // ── Total user count ────────────────────────────────────
      User.countDocuments(),

      // ── Appointment totals + status summary ─────────────────
      Appointment.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            today: [
              {
                $match: {
                  dateTime: {
                    $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                    $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
                  },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]),

      // ── Appointments by status ──────────────────────────────
      Appointment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { name: "$_id", value: "$count", _id: 0 } },
      ]),

      // ── Appointment trend over time (last N days) ───────────
      Appointment.aggregate([
        { $match: { dateTime: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateTime" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
      ]),

      // ── Revenue stats ───────────────────────────────────────
      Invoice.aggregate([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalInvoices: { $sum: 1 },
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
            ],
            thisMonth: [
              {
                $match: {
                  status: "paid",
                  paidAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                  },
                },
              },
              { $group: { _id: null, revenue: { $sum: "$total" } } },
            ],
            lastMonth: [
              {
                $match: {
                  status: "paid",
                  paidAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    $lt: new Date(now.getFullYear(), now.getMonth(), 1),
                  },
                },
              },
              { $group: { _id: null, revenue: { $sum: "$total" } } },
            ],
          },
        },
      ]),

      // ── Revenue by month (last 6 months) ────────────────────
      Invoice.aggregate([
        {
          $match: {
            status: "paid",
            paidAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$paidAt" },
            },
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", revenue: 1, count: 1, _id: 0 } },
      ]),

      // ── Revenue by payment method ───────────────────────────
      Invoice.aggregate([
        { $match: { status: "paid", paymentMethod: { $ne: null } } },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $project: { method: "$_id", amount: 1, count: 1, _id: 0 } },
      ]),

      // ── AI Diagnosis stats ──────────────────────────────────
      AIDiagnosisModel.countDocuments(),

      // ── AI Diagnosis by urgency level ───────────────────────
      AIDiagnosisModel.aggregate([
        {
          $group: {
            _id: "$result.urgencyLevel",
            count: { $sum: 1 },
          },
        },
        { $project: { name: "$_id", value: "$count", _id: 0 } },
      ]),

      // ── Consultation stats ──────────────────────────────────
      Consultation.countDocuments(),

      // ── Consultations by type ───────────────────────────────
      Consultation.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { name: "$_id", value: "$count", _id: 0 } },
      ]),

      // ── Average consultation duration ───────────────────────
      Consultation.aggregate([
        { $match: { duration: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$duration" },
            totalDuration: { $sum: "$duration" },
          },
        },
      ]),

      // ── Blood Bridge: donor stats ───────────────────────────
      BloodDonor.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            available: [
              { $match: { isAvailable: true } },
              { $count: "count" },
            ],
            byBloodType: [
              { $group: { _id: "$bloodType", count: { $sum: 1 } } },
              { $project: { name: "$_id", value: "$count", _id: 0 } },
            ],
          },
        },
      ]),

      // ── Blood Bridge: request stats ─────────────────────────
      BloodRequest.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
              { $project: { name: "$_id", value: "$count", _id: 0 } },
            ],
            byUrgency: [
              { $group: { _id: "$urgency", count: { $sum: 1 } } },
              { $project: { name: "$_id", value: "$count", _id: 0 } },
            ],
          },
        },
      ]),

      // ── Top doctors by appointment count + fee ──────────────
      Doctor.aggregate([
        {
          $lookup: {
            from: "appointments",
            localField: "_id",
            foreignField: "doctorId",
            as: "appointments",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            totalAppointments: { $size: "$appointments" },
            completedAppointments: {
              $size: {
                $filter: {
                  input: "$appointments",
                  as: "apt",
                  cond: { $eq: ["$$apt.status", "completed"] },
                },
              },
            },
          },
        },
        { $sort: { totalAppointments: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            name: "$user.name",
            avatar: "$user.avatar",
            specialization: 1,
            department: 1,
            consultationFee: 1,
            experience: 1,
            totalAppointments: 1,
            completedAppointments: 1,
            // Guard against missing consultationFee (null/undefined → 0).
            // NOTE: estimatedRevenue is derived from already-aggregated
            // counts and the doctor's fee — do NOT also add this to any
            // other revenue total or it will be double-counted.
            estimatedRevenue: {
              $multiply: [
                "$completedAppointments",
                { $ifNull: ["$consultationFee", 0] },
              ],
            },
          },
        },
      ]),
    ]);

    // ── Normalize results ─────────────────────────────────────

    const roleMap: Record<string, number> = {};
    for (const r of usersByRole) {
      roleMap[r._id] = r.count;
    }

    const revenueTotals = revenueStats[0]?.totals?.[0] ?? {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
    };
    const thisMonthRevenue = revenueStats[0]?.thisMonth?.[0]?.revenue ?? 0;
    const lastMonthRevenue = revenueStats[0]?.lastMonth?.[0]?.revenue ?? 0;
    const revenueChange =
      lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

    const appointmentTotals = appointmentStats[0] ?? {};
    const totalAppointments = appointmentTotals.total?.[0]?.count ?? 0;
    const todayAppointments = appointmentTotals.today?.[0]?.count ?? 0;

    const donorData = bloodDonorStats[0] ?? {};
    const requestData = bloodRequestStats[0] ?? {};

    const avgDur = avgConsultationDuration[0] ?? {};

    // Fill in missing days for user growth
    const growthMap = new Map(userGrowth.map((d: { date: string; count: number }) => [d.date, d.count]));
    const filledGrowth: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filledGrowth.push({ date: key, count: (growthMap.get(key) as number) ?? 0 });
    }

    const analytics = {
      overview: {
        totalUsers,
        usersByRole: {
          admin: roleMap.admin ?? 0,
          doctor: roleMap.doctor ?? 0,
          patient: roleMap.patient ?? 0,
          security_officer: roleMap.security_officer ?? 0,
        },
        totalAppointments,
        todayAppointments,
        totalRevenue: revenueTotals.paidAmount,
        totalInvoices: revenueTotals.totalInvoices,
        outstandingRevenue: revenueTotals.outstandingAmount,
        totalAIDiagnoses: aiDiagnosisStats,
        totalConsultations: consultationStats,
      },

      userGrowth: filledGrowth,
      patientRegistrationByMonth,

      appointments: {
        byStatus: appointmentsByStatus,
        trend: appointmentTrend,
      },

      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        changePercent: revenueChange,
        byMonth: revenueByMonth,
        byPaymentMethod: revenueByPaymentMethod,
      },

      aiDiagnosis: {
        total: aiDiagnosisStats,
        byUrgency: aiByUrgency,
      },

      consultations: {
        total: consultationStats,
        byType: consultationsByType,
        averageDuration: Math.round(avgDur.avgDuration ?? 0),
        totalDuration: avgDur.totalDuration ?? 0,
      },

      bloodBridge: {
        totalDonors: donorData.total?.[0]?.count ?? 0,
        availableDonors: donorData.available?.[0]?.count ?? 0,
        donorsByBloodType: donorData.byBloodType ?? [],
        totalRequests: requestData.total?.[0]?.count ?? 0,
        requestsByStatus: requestData.byStatus ?? [],
        requestsByUrgency: requestData.byUrgency ?? [],
      },

      topDoctors,
    };

    return successResponse(analytics);
  } catch (error: unknown) {
    console.error("[Admin Analytics] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
