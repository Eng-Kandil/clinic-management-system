import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISlot extends Document {
  doctorId: mongoose.Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
  status: "open" | "held" | "booked";
  heldBy?: mongoose.Types.ObjectId;
  heldUntil?: Date;
  createdAt: Date;
}

const SlotSchema = new Schema<ISlot>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ["open", "held", "booked"], required: true, default: "open" },
    heldBy: { type: Schema.Types.ObjectId, ref: "User" },
    heldUntil: { type: Date },
  },
  { timestamps: true }
);

// Unique compound index to prevent double-booking
SlotSchema.index({ doctorId: 1, startsAt: 1 }, { unique: true });

export const Slot: Model<ISlot> =
  mongoose.models.Slot ||
  mongoose.model<ISlot>("Slot", SlotSchema);
