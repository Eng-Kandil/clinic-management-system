import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { openai } from "@/lib/ai/openai";
import { MODELS } from "@/lib/ai/models";
import { redact, wrapUserInput } from "@/lib/ai/redact";
import { assertWithinLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { checkBudget, writeUsage, BudgetExceededError } from "@/lib/ai/telemetry";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  patientId: z.string(),
  indication: z.string().min(1).max(1000),
  allergies: z.array(z.string()).optional().default([]),
  currentMeds: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = Schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    await assertWithinLimit(session.user.id, "prescription-draft");
    await checkBudget();
  } catch (err) {
    if (err instanceof RateLimitExceededError) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (err instanceof BudgetExceededError) return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    throw err;
  }

  const { indication, allergies, currentMeds } = body.data;
  const startTime = Date.now();

  const prompt = wrapUserInput(
    `Indication: ${redact(indication)}\n` +
    `Known allergies: ${allergies.join(", ") || "none"}\n` +
    `Current medications: ${currentMeds.join(", ") || "none"}\n\n` +
    `Generate a prescription draft as JSON with this structure: { medications: [{ name, dose, route, frequency, durationDays, notes }], rationale, warnings }`
  );

  const completion = await openai.chat.completions.create({
    model: MODELS.reasoning,
    messages: [
      { role: "system", content: "You are a clinical decision support tool. Output only valid JSON for prescription drafts. Never auto-save — this is for doctor review only." },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 600,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const draft = JSON.parse(content);

  await writeUsage({
    userId: session.user.id,
    feature: "prescription-draft",
    model: MODELS.reasoning,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - startTime,
  });

  return NextResponse.json({ draft });
}
