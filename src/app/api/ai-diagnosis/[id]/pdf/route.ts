import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { AIDiagnosisModel } from "@/lib/db/models/AIDiagnosis";
import { errorResponse } from "@/lib/utils/api-response";

// ---------------------------------------------------------------------------
// GET /api/ai-diagnosis/[id]/pdf
// Printable HTML report for an AI diagnosis (browser print-to-PDF). Carries
// a prominent "AI-GENERATED — NOT A MEDICAL DIAGNOSIS" watermark.
//
// Ownership: patients see only their own; doctors and admins see any.
// (Mirrors the read rules in /api/ai-diagnosis GET.)
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return errorResponse("Invalid diagnosis id", 400);
    }

    await connectDB();

    const diagnosis = await AIDiagnosisModel.findById(id)
      .populate("patientId", "name email")
      .populate("reviewedBy", "name")
      .lean();

    if (!diagnosis) return errorResponse("Diagnosis not found", 404);

    // Ownership — patientId currently stores User._id (see model TODO)
    const patientField = diagnosis.patientId as unknown as
      | { _id: mongoose.Types.ObjectId; name?: string; email?: string }
      | mongoose.Types.ObjectId
      | string;

    const patientUserId =
      typeof patientField === "object" && patientField !== null && "_id" in patientField
        ? patientField._id.toString()
        : String(patientField);

    if (
      session.user.role === "patient" &&
      patientUserId !== session.user.id
    ) {
      return errorResponse("Forbidden", 403);
    }
    if (!["patient", "doctor", "admin"].includes(session.user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const patientName =
      typeof patientField === "object" && patientField !== null && "name" in patientField
        ? patientField.name ?? "Unknown"
        : "Unknown";

    const reviewer = diagnosis.reviewedBy as unknown as
      | { name?: string }
      | null
      | undefined;

    const result = diagnosis.result;
    const conditions = result?.conditions ?? [];
    const recommendations = result?.recommendations ?? [];

    const conditionRows = conditions
      .map(
        (c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td style="text-align:right">${(c.probability * 100).toFixed(1)}%</td>
        <td>${escapeHtml(c.description)}</td>
      </tr>`
      )
      .join("");

    const recommendationItems = recommendations
      .map((r) => `<li>${escapeHtml(r)}</li>`)
      .join("");

    const urgencyColor: Record<string, string> = {
      low: "#16a34a",
      medium: "#ca8a04",
      high: "#ea580c",
      emergency: "#dc2626",
    };
    const urgency = result?.urgencyLevel ?? "low";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Diagnosis ${escapeHtml(id)}</title>
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
      color: rgba(220, 38, 38, 0.09);
      font-size: 48px;
      font-weight: bold;
      position: fixed;
      top: 35%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-22deg);
      z-index: -1;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      text-align: center;
      line-height: 1.2;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #333;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0 0 4px; font-size: 24px; }
    .header p { margin: 2px 0; font-size: 12px; color: #555; }
    .alert-banner {
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #991b1b;
      font-size: 13px;
    }
    .alert-banner strong { font-size: 14px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-grid .label { font-weight: bold; font-size: 12px; color: #555; text-transform: uppercase; }
    .info-grid .value { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f4f4f4; text-align: left; padding: 8px; border: 1px solid #ccc; font-size: 12px; text-transform: uppercase; color: #555; }
    td { padding: 8px; border: 1px solid #ccc; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .urgency-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: white;
    }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .disclaimer {
      background: #fffbe6;
      border: 1px solid #f0e68c;
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      color: #6b5d00;
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
  <div class="watermark">
    AI-GENERATED<br/>NOT A MEDICAL DIAGNOSIS
  </div>

  <div class="alert-banner">
    <strong>⚠ AI-GENERATED — NOT A MEDICAL DIAGNOSIS</strong><br/>
    This report was produced by an automated symptom-analysis system and is for
    informational purposes only. It is <strong>not</strong> a substitute for professional
    medical advice, diagnosis, or treatment. Always consult a qualified
    healthcare provider.
  </div>

  <div class="header">
    <div>
      <h1>AI Diagnosis Report</h1>
      <p>ID: ${escapeHtml(id)}</p>
      <p>Generated: ${new Date(diagnosis.createdAt).toLocaleString()}</p>
    </div>
    <div>
      <span class="urgency-badge" style="background:${urgencyColor[urgency] ?? "#6b7280"}">
        ${escapeHtml(urgency)}
      </span>
    </div>
  </div>

  <div class="section">
    <h2>Patient Information</h2>
    <div class="info-grid">
      <div>
        <div class="label">Patient</div>
        <div class="value">${escapeHtml(patientName)}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="value">${escapeHtml(diagnosis.status)}</div>
      </div>
      ${
        diagnosis.patientAge !== undefined
          ? `<div><div class="label">Age</div><div class="value">${diagnosis.patientAge}</div></div>`
          : ""
      }
      ${
        diagnosis.patientGender
          ? `<div><div class="label">Gender</div><div class="value">${escapeHtml(diagnosis.patientGender)}</div></div>`
          : ""
      }
    </div>
  </div>

  <div class="section">
    <h2>Reported Symptoms</h2>
    <ul>
      ${diagnosis.symptoms.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
    </ul>
    ${
      diagnosis.additionalInfo
        ? `<p style="margin-top:8px"><strong>Additional info:</strong> ${escapeHtml(diagnosis.additionalInfo)}</p>`
        : ""
    }
  </div>

  <div class="section">
    <h2>Possible Conditions (${conditions.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Condition</th>
          <th style="text-align:right">Probability</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${conditionRows || '<tr><td colspan="3" style="text-align:center;color:#888">No conditions identified</td></tr>'}
      </tbody>
    </table>
  </div>

  ${
    recommendations.length > 0
      ? `<div class="section">
    <h2>Recommendations</h2>
    <ul>${recommendationItems}</ul>
  </div>`
      : ""
  }

  ${
    diagnosis.doctorNotes
      ? `<div class="section">
    <h2>Doctor Notes${reviewer?.name ? ` — ${escapeHtml(reviewer.name)}` : ""}</h2>
    <div class="disclaimer" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
      ${escapeHtml(diagnosis.doctorNotes)}
    </div>
  </div>`
      : ""
  }

  <div class="section">
    <h2>Disclaimer</h2>
    <div class="disclaimer">
      ${escapeHtml(result?.disclaimer ?? "This AI-generated report is not a substitute for professional medical advice.")}
    </div>
  </div>

  <div class="footer">
    <p>Generated by the Clinic Management System AI Diagnosis Engine. Report ID: ${escapeHtml(id)}</p>
    <p>For any health concerns, please consult a licensed medical professional.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="ai-diagnosis-${id}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("AI Diagnosis PDF GET error:", error);
    return errorResponse("Failed to generate diagnosis report", 500);
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
