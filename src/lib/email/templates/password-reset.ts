interface Params {
  name: string;
  resetUrl: string;
}

interface Template {
  subject: string;
  html: string;
  text: string;
}

const FOOTER_HTML =
  '<hr/><p style="color:#888;font-size:12px">Clinic Management System (DEMO)</p>';
const FOOTER_TEXT = "\n\n--\nClinic Management System (DEMO)";

export function passwordReset({ name, resetUrl }: Params): Template {
  const subject = "Reset your Clinic Management password";
  const html = `
    <h2>Password Reset</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    ${FOOTER_HTML}
  `;
  const text =
    `Password Reset\n\nHi ${name},\n\n` +
    `We received a request to reset your password. Open the link below to choose a new one (expires in 1 hour):\n` +
    `${resetUrl}\n\n` +
    `If you didn't request this, ignore this email.${FOOTER_TEXT}`;
  return { subject, html, text };
}
