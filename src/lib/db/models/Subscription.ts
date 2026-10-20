import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentHistoryEntry {
  amount: number;
  date: Date;
  method: string;
  transactionId: string;
}

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  plan: "free" | "basic" | "premium";
  price: number;
  features: string[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  autoRenew: boolean;
  paymentHistory: IPaymentHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentHistorySchema = new Schema<IPaymentHistoryEntry>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    method: { type: String, required: true },
    transactionId: { type: String, required: true },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "basic", "premium"],
      required: true,
      default: "free",
    },
    price: { type: Number, required: true, min: 0, default: 0 },
    features: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    autoRenew: { type: Boolean, default: false },
    paymentHistory: [PaymentHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionSchema.index({ patientId: 1 });
SubscriptionSchema.index({ plan: 1, isActive: 1 });
SubscriptionSchema.index({ endDate: 1 });

export const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
