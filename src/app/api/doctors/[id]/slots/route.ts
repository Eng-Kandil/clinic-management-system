import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Doctor } from "@/lib/db/models/Doctor";
import { Appointment } from "@/lib/db/models/Appointment";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { clinicWallTimeToInstant } from "@/lib/utils/datetime";

// ---------------------------------------------------------------------------
// GET /api/doctors/[id]/slots?date=YYYY-MM-DD — Available time slots
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid doctor ID", 400);
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return errorResponse("Valid date parameter required (YYYY-MM-DD)", 400);
    }

    // Determine day of week
    const date = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(date.getTime())) {
      return errorResponse("Invalid date", 400);
    }

    const dayOfWeek = date.getUTCDay(); // 0=Sunday, 6=Saturday

    // Get doctor's available slots for that day
    const doctor = await Doctor.findById(id).lean();
    if (!doctor) return errorResponse("Doctor not found", 404);

    const daySlots = doctor.availableSlots?.filter(
      (slot) => slot.dayOfWeek === dayOfWeek
    );

    if (!daySlots || daySlots.length === 0) {
      return successResponse([], "No available slots for this day");
    }

    // Get existing appointments for that date (not cancelled)
    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd = new Date(dateStr + "T23:59:59.999Z");

    const existingAppointments = await Appointment.find({
      doctorId: id,
      dateTime: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled"] },
    })
      .select("dateTime endTime")
      .lean();

    // Generate 30-minute slots from each available range and mark availability
    const allSlots: { startTime: string; endTime: string; available: boolean }[] = [];

    for (const range of daySlots) {
      const [startH = 0, startM = 0] = range.startTime.split(":").map(Number);
      const [endH = 0, endM = 0] = range.endTime.split(":").map(Number);

      const rangeStartMinutes = startH * 60 + startM;
      const rangeEndMinutes = endH * 60 + endM;

      // Generate 30-min intervals
      for (
        let minutes = rangeStartMinutes;
        minutes + 30 <= rangeEndMinutes;
        minutes += 30
      ) {
        const slotStartH = Math.floor(minutes / 60);
        const slotStartM = minutes % 60;
        const slotEndH = Math.floor((minutes + 30) / 60);
        const slotEndM = (minutes + 30) % 60;

        const slotStart = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
        const slotEnd = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

        // Check if this slot conflicts with any existing appointment
        const slotStartDate = new Date(`${dateStr}T${slotStart}:00.000Z`);
        const slotEndDate = new Date(`${dateStr}T${slotEnd}:00.000Z`);

        const isBooked = existingAppointments.some((appt) => {
          const apptStart = new Date(appt.dateTime).getTime();
          const apptEnd = new Date(appt.endTime).getTime();
          const sStart = slotStartDate.getTime();
          const sEnd = slotEndDate.getTime();

          // Overlap: slot starts before appointment ends AND slot ends after appointment starts
          return sStart < apptEnd && sEnd > apptStart;
        });

        // Same-day booking: a slot is only bookable if it hasn't started yet.
        // Compare the slot's true instant (clinic-local wall-clock → UTC) to now
        // so the cutoff is correct regardless of the viewer's timezone. For past
        // dates this disables every slot; for today it keeps the upcoming ones.
        const isPast =
          clinicWallTimeToInstant(dateStr, slotStart).getTime() <= Date.now();

        allSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: !isBooked && !isPast,
        });
      }
    }

    return successResponse(allSlots);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
