import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email.
 * - In development: logs to console and returns true.
 * - In production: uses nodemailer with SMTP config from env vars.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<boolean> {
  // Development mode — log to console
  if (process.env.NODE_ENV !== "production") {
    console.log("──────────────────────────────────────");
    console.log("[DEV EMAIL]");
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${html.slice(0, 200)}${html.length > 200 ? "..." : ""}`);
    console.log("──────────────────────────────────────");
    return true;
  }

  // Production mode — send via SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@clinic.com",
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
