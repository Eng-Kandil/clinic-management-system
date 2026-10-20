import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { openai } from "@/lib/ai/openai";
import { MODELS } from "@/lib/ai/models";
import { wrapUserInput } from "@/lib/ai/redact";
import { assertWithinLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { checkBudget, writeUsage, BudgetExceededError } from "@/lib/ai/telemetry";
import { MEDICAL_DISCLAIMER } from "@/lib/ai/safety";
import connectDB from "@/lib/db/connect";
import { ChatSession } from "@/lib/db/models/ChatSession";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const Schema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "src/lib/ai/prompts/system.chat.md"),
  "utf-8"
);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = Schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }

    const { message, sessionId } = body.data;
    const userId = session.user.id;

    // Rate limit + budget check
    try {
      await assertWithinLimit(userId, "chat");
      await checkBudget();
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
      }
      if (err instanceof BudgetExceededError) {
        return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 503 });
      }
      throw err;
    }

    await connectDB();

    // Load or create chat session
    let chatSession = sessionId
      ? await ChatSession.findOne({ _id: sessionId, userId })
      : null;

    if (!chatSession) {
      chatSession = await ChatSession.create({
        userId,
        title: message.slice(0, 50),
        messages: [],
        lastMessageAt: new Date(),
      });
    }

    // Build message history (last 10 messages for context)
    const history = chatSession.messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history,
      { role: "user" as const, content: wrapUserInput(message) },
    ];

    const startTime = Date.now();

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: MODELS.chat,
            messages,
            max_completion_tokens: 600,
            stream: true,
          });

          let fullContent = "";
          let tokensIn = 0;
          let tokensOut = 0;

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
            if (chunk.usage) {
              tokensIn = chunk.usage.prompt_tokens ?? 0;
              tokensOut = chunk.usage.completion_tokens ?? 0;
            }
          }

          // Append disclaimer
          const finalContent = fullContent + "\n\n---\n*" + MEDICAL_DISCLAIMER + "*";

          // Save to DB
          await ChatSession.findByIdAndUpdate(chatSession!._id, {
            $push: {
              messages: {
                $each: [
                  { role: "user", content: message, createdAt: new Date() },
                  { role: "assistant", content: finalContent, model: MODELS.chat, tokensIn, tokensOut, createdAt: new Date() },
                ],
                $slice: -50,
              },
            },
            lastMessageAt: new Date(),
          });

          await writeUsage({
            userId,
            feature: "chat",
            model: MODELS.chat,
            tokensIn,
            tokensOut,
            latencyMs: Date.now() - startTime,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId: chatSession!._id })}\n\n`));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI chat]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
