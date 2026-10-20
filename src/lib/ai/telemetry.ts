import connectDB from "@/lib/db/connect";
import { AIUsage } from "@/lib/db/models/AIUsage";
import { computeCostUsd } from "./models";

export interface UsageParams {
  userId: string;
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status?: "success" | "error" | "rate_limited" | "budget_exceeded";
  errorCode?: string;
}

export async function writeUsage(params: UsageParams): Promise<void> {
  try {
    await connectDB();
    await AIUsage.create({
      userId: params.userId,
      feature: params.feature,
      model: params.model,
      tokensIn: params.tokensIn,
      tokensOut: params.tokensOut,
      costUsd: computeCostUsd(params.model, params.tokensIn, params.tokensOut),
      latencyMs: params.latencyMs,
      status: params.status ?? "success",
      errorCode: params.errorCode,
    });
  } catch (err) {
    // Non-fatal — do not break the main request
    console.error("[AI telemetry] Failed to write usage:", err);
  }
}

export async function checkBudget(): Promise<void> {
  const monthlyBudget = Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? 50);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await connectDB();
  const result = await AIUsage.aggregate([
    { $match: { createdAt: { $gte: monthStart }, status: "success" } },
    { $group: { _id: null, totalCost: { $sum: "$costUsd" } } },
  ]);

  const totalCost = result[0]?.totalCost ?? 0;

  if (totalCost >= monthlyBudget) {
    throw new BudgetExceededError(
      `Monthly AI budget of $${monthlyBudget} exceeded (used: $${totalCost.toFixed(2)})`
    );
  }
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}
