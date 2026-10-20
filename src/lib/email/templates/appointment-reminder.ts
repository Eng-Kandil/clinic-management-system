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

export function appointmentReminder({
  patientName,
  doctorName,
  dateTime,
  location,
}: Params): Template {
  const when = fmt(dateTime);
  const subject = `Reminder: appointment with ${doctorName}`;
  const html = `
    <h2>Appointment Reminder</h2>
    <p>Hi ${patientName},</p>
    <p>This is a reminder of your upcoming appointment with <strong>${doctorName}</strong>.</p>
    <ul>
      <li><strong>When:</strong> ${when}</li>
      <li><strong>Where:</strong> ${location}</li>
    </ul>
    <p>If you can no longer make it, please cancel or reschedule.</p>
    ${FOOTER_HTML}
  `;
  const text =
    `Appointment Reminder\n\nHi ${patientName},\n\n` +
    `Reminder of your upcoming appointment with ${doctorName}.\n` +
    `When: ${when}\nWhere: ${location}\n` +
    `If you can no longer make it, please cancel or reschedule.${FOOTER_TEXT}`;
  return { subject, html, text };
}
