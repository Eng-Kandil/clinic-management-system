import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { successResponse } from "@/lib/utils";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { Appointment } from "@/lib/db/models/Appointment";
import { Invoice } from "@/lib/db/models/Invoice";
import { User } from "@/lib/db/models/User";

// ---------------------------------------------------------------------------
// GET /api/analytics — admin only
// ---------------------------------------------------------------------------

export const GET = withAuth(async (_req: NextRequest) => {
  await connectDB();

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalPatients,
    totalDoctors,
    todayAppointments,
    monthlyRevenueAgg,
    appointmentTrendAgg,
    revenueTrendAgg,
    registrationTrendAgg,
    appointmentStatusAgg,
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Appointment.countDocuments({
      dateTime: { $gte: startOfDay, $lte: endOfDay },
    }),
    Invoice.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: now,
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    // Appointments per day for the last 7 days
    Appointment.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]),
    // Revenue per day for the last 7 days
    Invoice.aggregate([
      { $match: { status: "paid", paidAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", revenue: 1, _id: 0 } },
    ]),
    // New user registrations per day for the last 7 days
    User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]),
    // Appointment status distribution
    Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count", _id: 0 } },
    ]),
  ]);

  const monthlyRevenue = monthlyRevenueAgg[0]?.total ?? 0;

  return successResponse({
    totalPatients,
    totalDoctors,
    todayAppointments,
    monthlyRevenue,
    appointmentsTrend: appointmentTrendAgg,
    revenueTrend: revenueTrendAgg,
    registrationTrend: registrationTrendAgg,
    appointmentStatusDistribution: appointmentStatusAgg,
  });
}, ["admin"]);
