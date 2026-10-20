import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIUsage extends Omit<Document, "model"> {
  userId: mongoose.Types.ObjectId;
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "error" | "rate_limited" | "budget_exceeded";
  errorCode?: string;
  createdAt: Date;
}

const AIUsageSchema = new Schema<IAIUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    feature: { type: String, required: true },
    model: { type: String, required: true },
    tokensIn: { type: Number, required: true, default: 0, min: 0 },
    tokensOut: { type: Number, required: true, default: 0, min: 0 },
    costUsd: { type: Number, required: true, default: 0, min: 0 },
    latencyMs: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["success", "error", "rate_limited", "budget_exceeded"],
      required: true,
      default: "success",
    },
    errorCode: { type: String },
  },
  { timestamps: true }
);

AIUsageSchema.index({ createdAt: -1 });
AIUsageSchema.index({ userId: 1, createdAt: -1 });

export const AIUsage: Model<IAIUsage> =
  mongoose.models.AIUsage || mongoose.model<IAIUsage>("AIUsage", AIUsageSchema);
