import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { Prescription } from "@/lib/db/models/Prescription";
import { auth } from "@/lib/auth/auth.config";
import { assertCanReadPrescription } from "@/lib/auth/ownership";
import { errorResponse } from "@/lib/utils/api-response";

// GET /api/prescriptions/[id]/pdf
// Returns a printable HTML document for the prescription (browser print-to-PDF).
// Requires the caller to have read access to the prescription (same rules as GET /api/prescriptions/[id]).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    await connectDB();

    const rx = await Prescription.findById(id)
      .populate({
        path: "patientId",
        select: "userId",
        populate: { path: "user", select: "name" },
      })
      .populate({
        path: "doctorId",
        select: "userId specialization",
        populate: { path: "user", select: "name" },
      })
      .lean();

    if (!rx) {
      return errorResponse("Prescription not found", 404);
    }

    // IDOR ownership check — same rules as GET /api/prescriptions/[id]
    const ownershipDenied = await assertCanReadPrescription(session, rx);
    if (ownershipDenied) return ownershipDenied;

    const patientDoc = rx.patientId as unknown as {
      user?: { name?: string };
    } | null;
    const doctorDoc = rx.doctorId as unknown as {
      user?: { name?: string };
      specialization?: string;
    } | null;
    const patient = {
      name: patientDoc?.user?.name,
    } as Record<string, unknown>;
    const doctor = {
      name: doctorDoc?.user?.name,
      specialty: doctorDoc?.specialization,
    } as Record<string, unknown>;
    const medications = rx.medications ?? [];

    const medicationRows = medications
      .map(
        (med) => `
      <tr>
        <td>${escapeHtml(med.name)}</td>
        <td>${escapeHtml(med.dosage)}</td>
        <td>${escapeHtml(med.frequency)}</td>
        <td>${escapeHtml(med.duration)}</td>
        <td>${med.startDate ? new Date(med.startDate).toLocaleDateString() : ""}</td>
        <td>${med.endDate ? new Date(med.endDate).toLocaleDateString() : ""}</td>
        <td>${escapeHtml(med.instructions ?? "")}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prescription ${id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #111;
      max-width: 860px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.5;
    }
    .watermark {
      color: #e0e0e0;
      font-size: 80px;
      font-weight: bold;
      position: fixed;
      top: 38%;
      left: 12%;
      transform: rotate(-30deg);
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #333;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0 0 4px; font-size: 24px; }
    .header p { margin: 2px 0; font-size: 12px; color: #555; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-grid .label { font-weight: bold; font-size: 12px; color: #555; text-transform: uppercase; }
    .info-grid .value { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f4f4f4; text-align: left; padding: 8px; border: 1px solid #ccc; font-size: 12px; text-transform: uppercase; color: #555; }
    td { padding: 8px; border: 1px solid #ccc; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .notes { background: #fffbe6; border: 1px solid #f0e68c; border-radius: 4px; padding: 12px; }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      background: #d4edda;
      color: #155724;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 12px;
      font-size: 11px;
      color: #888;
      text-align: center;
    }
    @media print {
      body { margin: 0; }
      .watermark { position: fixed; }
    }
  </style>
</head>
<body>
  <div class="watermark">CLINIC</div>

  <div class="header">
    <div>
      <h1>Prescription</h1>
      <p>ID: ${escapeHtml(id)}</p>
      <p>Issued: ${new Date((rx as unknown as Record<string, unknown>).createdAt as Date).toLocaleDateString()}</p>
    </div>
    <div>
      <span class="status-badge">${escapeHtml(rx.status ?? "")}</span>
    </div>
  </div>

  <div class="section">
    <h2>Patient &amp; Doctor</h2>
    <div class="info-grid">
      <div>
        <div class="label">Patient</div>
        <div class="value">${escapeHtml((patient?.name as string) ?? String(rx.patientId))}</div>
      </div>
      <div>
        <div class="label">Doctor</div>
        <div class="value">${escapeHtml((doctor?.name as string) ?? String(rx.doctorId))}</div>
      </div>
      ${doctor?.specialty ? `<div><div class="label">Specialty</div><div class="value">${escapeHtml(doctor.specialty as string)}</div></div>` : ""}
      ${rx.refillOf ? `<div><div class="label">Refill of</div><div class="value">${escapeHtml(rx.refillOf.toString())}</div></div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>Medications (${medications.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Start</th>
          <th>End</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medicationRows || '<tr><td colspan="7" style="text-align:center;color:#888">No medications listed</td></tr>'}
      </tbody>
    </table>
  </div>

  ${
    rx.notes
      ? `<div class="section">
    <h2>Notes</h2>
    <div class="notes">${escapeHtml(rx.notes)}</div>
  </div>`
      : ""
  }

  <div class="footer">
    <p>This document was generated by the Clinic Management System. Prescription ID: ${escapeHtml(id)}</p>
    <p>For verification, contact your healthcare provider.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="prescription-${id}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Prescription PDF GET error:", error);
    return errorResponse("Failed to generate prescription document", 500);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
