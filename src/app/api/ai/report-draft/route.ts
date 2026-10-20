import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { openai } from "@/lib/ai/openai";
import { MODELS } from "@/lib/ai/models";
import { wrapUserInput } from "@/lib/ai/redact";
import { assertWithinLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { checkBudget, writeUsage, BudgetExceededError } from "@/lib/ai/telemetry";
import connectDB from "@/lib/db/connect";
import { Consultation, type IConsultationMessage } from "@/lib/db/models/Consultation";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  consultationId: z.string(),
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
    await assertWithinLimit(session.user.id, "report-draft");
    await checkBudget();
  } catch (err) {
    if (err instanceof RateLimitExceededError) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (err instanceof BudgetExceededError) return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    throw err;
  }

  await connectDB();
  const consultation = await Consultation.findById(body.data.consultationId).lean();
  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  const startTime = Date.now();
  const messages: IConsultationMessage[] = consultation.messages ?? [];
  const transcript = messages
    .map((m) => `${String(m.senderId)}: ${m.content}`)
    .join("\n")
    .slice(0, 3000);

  const prompt = wrapUserInput(
    `Generate a SOAP clinical note for this consultation.\nTranscript:\n${transcript}\n\nOutput JSON: { subjective, objective, assessment, plan, followUp }`
  );

  const completion = await openai.chat.completions.create({
    model: MODELS.reasoning,
    messages: [
      { role: "system", content: "You are a clinical documentation assistant. Generate SOAP notes. Output only valid JSON." },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const draft = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  await writeUsage({
    userId: session.user.id,
    feature: "report-draft",
    model: MODELS.reasoning,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - startTime,
  });

  return NextResponse.json({ draft });
}
