interface Params {
  patientName: string;
  doctorName: string;
  dateTime: string | Date;
  location: string;
}

interface Template {
  subject: string;
  html: string;
  text: string;
}

const FOOTER_HTML =
  '<hr/><p style="color:#888;font-size:12px">Clinic Management System (DEMO)</p>';
const FOOTER_TEXT = "\n\n--\nClinic Management System (DEMO)";

function fmt(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export function appointmentConfirmation({
  patientName,
  doctorName,
  dateTime,
  location,
}: Params): Template {
  const when = fmt(dateTime);
  const subject = `Appointment confirmed with ${doctorName}`;
  const html = `
    <h2>Appointment Confirmed</h2>
    <p>Hi ${patientName},</p>
    <p>Your appointment with <strong>${doctorName}</strong> is confirmed.</p>
    <ul>
      <li><strong>When:</strong> ${when}</li>
      <li><strong>Where:</strong> ${location}</li>
    </ul>
    <p>Please arrive 10 minutes early.</p>
    ${FOOTER_HTML}
  `;
  const text =
    `Appointment Confirmed\n\nHi ${patientName},\n\n` +
    `Your appointment with ${doctorName} is confirmed.\n` +
    `When: ${when}\nWhere: ${location}\n` +
    `Please arrive 10 minutes early.${FOOTER_TEXT}`;
  return { subject, html, text };
}
