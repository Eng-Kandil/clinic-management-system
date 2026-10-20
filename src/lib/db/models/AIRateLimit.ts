import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIRateLimit extends Document {
  userId: mongoose.Types.ObjectId;
  feature: string;
  windowStart: Date;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIRateLimitSchema = new Schema<IAIRateLimit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    feature: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

AIRateLimitSchema.index({ userId: 1, feature: 1, windowStart: 1 }, { unique: true });

// TTL: auto-delete records older than 24 hours
AIRateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 86400 });

export const AIRateLimit: Model<IAIRateLimit> =
  mongoose.models.AIRateLimit || mongoose.model<IAIRateLimit>("AIRateLimit", AIRateLimitSchema);
