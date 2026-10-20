import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/connect";

let openAiStatusCache: { status: string; checkedAt: number } | null = null;
const OPENAI_CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET() {
  const timestamp = new Date().toISOString();

  // Check DB
  let dbStatus = "ok";
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
  } catch {
    dbStatus = "degraded";
  }

  // Check OpenAI (cached)
  let openaiStatus = "skip";
  if (process.env.OPENAI_API_KEY) {
    const now = Date.now();
    if (
      openAiStatusCache &&
      now - openAiStatusCache.checkedAt < OPENAI_CACHE_TTL
    ) {
      openaiStatus = openAiStatusCache.status;
    } else {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: AbortSignal.timeout(5000),
        });
        openaiStatus = response.ok ? "ok" : "degraded";
        openAiStatusCache = { status: openaiStatus, checkedAt: now };
      } catch {
        openaiStatus = "degraded";
        openAiStatusCache = { status: openaiStatus, checkedAt: now };
      }
    }
  }

  const isHealthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      db: dbStatus,
      openai: openaiStatus,
      timestamp,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
