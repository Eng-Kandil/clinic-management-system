import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  provider: "stripe" | "manual" | "demo";
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  idempotencyKey: string;
  raw?: Record<string, unknown>;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    provider: { type: String, enum: ["stripe", "manual", "demo"], required: true, default: "demo" },
    providerPaymentId: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "TRY", uppercase: true, maxlength: 3 },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      required: true,
      default: "pending",
    },
    idempotencyKey: { type: String, required: true, unique: true },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
