import { NextResponse } from "next/server";
import { Patient } from "@/lib/db/models/Patient";
import { Doctor } from "@/lib/db/models/Doctor";
import { errorResponse } from "@/lib/utils/api-response";

/**
 * Checks whether the caller's session is allowed to read the given prescription.
 * Returns a 403 NextResponse if access is denied, or null if access is granted.
 *
 * Rules:
 *   - admin: always allowed
 *   - patient: only their own prescriptions (Patient.userId === session.user.id)
 *   - doctor: only prescriptions they authored (Doctor.userId === session.user.id)
 *   - any other role: denied
 */
export async function assertCanReadPrescription(
  session: { user: { id: string; role: string } },
  rx: { patientId?: { toString(): string } | null; doctorId?: { toString(): string } | null }
): Promise<NextResponse | null> {
  const role = session.user.role;

  if (role === "admin") return null;

  if (role === "patient") {
    const patient = await Patient.findOne({ userId: session.user.id }).lean();
    if (patient && rx.patientId?.toString() === patient._id.toString()) return null;
    return errorResponse("Forbidden", 403) as NextResponse;
  }

  if (role === "doctor") {
    const doctor = await Doctor.findOne({ userId: session.user.id }).lean();
    if (doctor && rx.doctorId?.toString() === doctor._id.toString()) return null;
    return errorResponse("Forbidden", 403) as NextResponse;
  }

  return errorResponse("Forbidden", 403) as NextResponse;
}
