interface Params {
  patientName: string;
  doctorName: string;
}

interface Template {
  subject: string;
  html: string;
  text: string;
}

const FOOTER_HTML =
  '<hr/><p style="color:#888;font-size:12px">Clinic Management System (DEMO)</p>';
const FOOTER_TEXT = "\n\n--\nClinic Management System (DEMO)";

export function prescriptionReady({ patientName, doctorName }: Params): Template {
  const subject = `New prescription from ${doctorName}`;
  const html = `
    <h2>Prescription Ready</h2>
    <p>Hi ${patientName},</p>
    <p><strong>${doctorName}</strong> has issued a new prescription for you.</p>
    <p>Sign in to your patient dashboard to view dosage instructions and download the PDF.</p>
    ${FOOTER_HTML}
  `;
  const text =
    `Prescription Ready\n\nHi ${patientName},\n\n` +
    `${doctorName} has issued a new prescription for you.\n` +
    `Sign in to your patient dashboard to view dosage instructions and download the PDF.${FOOTER_TEXT}`;
  return { subject, html, text };
}
