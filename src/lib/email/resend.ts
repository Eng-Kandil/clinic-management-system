// Resend email client wrapper with lazy import.
// pnpm add resend

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

let warned = false;
function warnMissing(): void {
  if (!warned) {
    console.warn("[email/resend] RESEND_API_KEY is not set — emails will be no-ops.");
    warned = true;
  }
}

interface ResendCtor {
  new (apiKey: string): {
    emails: {
      send(args: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
      }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
    };
  };
}

let cachedClient: InstanceType<ResendCtor> | null = null;

async function getClient(): Promise<InstanceType<ResendCtor> | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    warnMissing();
    return null;
  }
  if (cachedClient) return cachedClient;
  try {
    // pnpm add resend
    // @ts-expect-error optional dependency, resolved at runtime
    const mod = (await import("resend")) as unknown as { Resend: ResendCtor };
    cachedClient = new mod.Resend(apiKey);
    return cachedClient;
  } catch (err) {
    console.warn(
      "[email/resend] 'resend' package not installed. Run `pnpm add resend`. Falling back to no-op.",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const client = await getClient();
    if (!client) {
      // No-op stub — pretend success so callers don't break the flow.
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[email/resend] (stub) to=${to} subject=${subject} body=${(text ?? html).slice(0, 120)}`
        );
      }
      return { ok: true };
    }

    const from = process.env.RESEND_FROM || "Clinic <onboarding@resend.dev>";
    const sendArgs: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
    } = { from, to, subject, html };
    if (text !== undefined) sendArgs.text = text;
    const res = await client.emails.send(sendArgs);

    if (res.error) {
      return { ok: false, error: res.error.message ?? "Unknown Resend error" };
    }
    const result: SendEmailResult = { ok: true };
    if (res.data?.id) result.id = res.data.id;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email/resend] send failed:", message);
    return { ok: false, error: message };
  }
}
