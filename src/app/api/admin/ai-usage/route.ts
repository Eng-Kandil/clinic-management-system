import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { AIUsage } from "@/lib/db/models/AIUsage";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlySummary, byFeature, recentUsage] = await Promise.all([
    AIUsage.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, totalCost: { $sum: "$costUsd" }, totalTokens: { $sum: { $add: ["$tokensIn", "$tokensOut"] } }, totalRequests: { $sum: 1 } } },
    ]),
    AIUsage.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: "$feature", cost: { $sum: "$costUsd" }, requests: { $sum: 1 } } },
    ]),
    AIUsage.find({}).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const budget = Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? 50);
  const totalCost = monthlySummary[0]?.totalCost ?? 0;

  return NextResponse.json({
    budget,
    totalCost,
    budgetUsedPercent: (totalCost / budget) * 100,
    byFeature,
    recentUsage,
  });
}
