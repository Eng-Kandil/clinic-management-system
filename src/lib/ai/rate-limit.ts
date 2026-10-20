import connectDB from "@/lib/db/connect";
import { AIRateLimit } from "@/lib/db/models/AIRateLimit";

interface LimitConfig {
  maxCount: number;
  windowMs: number;
}

const LIMITS: Record<string, LimitConfig> = {
  chat: { maxCount: 30, windowMs: 60 * 60 * 1000 }, // 30/hr
  diagnosis: { maxCount: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10/day
  "prescription-draft": { maxCount: 50, windowMs: 24 * 60 * 60 * 1000 }, // 50/day
  "report-draft": { maxCount: 50, windowMs: 24 * 60 * 60 * 1000 }, // 50/day
};

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

export async function assertWithinLimit(userId: string, feature: string): Promise<void> {
  await connectDB();

  const config = LIMITS[feature] ?? { maxCount: 100, windowMs: 60 * 60 * 1000 };
  const windowStart = new Date(Math.floor(Date.now() / config.windowMs) * config.windowMs);

  const result = await AIRateLimit.findOneAndUpdate(
    { userId, feature, windowStart },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  if (result.count > config.maxCount) {
    throw new RateLimitExceededError(
      `Rate limit exceeded for ${feature}: ${result.count}/${config.maxCount} per window`
    );
  }
}
