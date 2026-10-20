import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBloodDonorLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface IBloodDonor extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  isAvailable: boolean;
  lastDonationDate?: Date;
  nextEligibleDate?: Date;
  location: IBloodDonorLocation;
  healthConditions?: string[];
  donationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BloodDonorLocationSchema = new Schema<IBloodDonorLocation>(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: "Coordinates must be [longitude, latitude]",
      },
    },
    address: { type: String },
  },
  { _id: false }
);

const BloodDonorSchema = new Schema<IBloodDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: [true, "Blood type is required"],
    },
    isAvailable: { type: Boolean, default: true },
    lastDonationDate: { type: Date },
    nextEligibleDate: { type: Date },
    location: {
      type: BloodDonorLocationSchema,
      required: true,
    },
    healthConditions: [{ type: String, trim: true }],
    donationCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
BloodDonorSchema.index({ userId: 1 });
BloodDonorSchema.index({ bloodType: 1 });
BloodDonorSchema.index({ isAvailable: 1 });
BloodDonorSchema.index({ location: "2dsphere" });

export const BloodDonor: Model<IBloodDonor> =
  mongoose.models.BloodDonor ||
  mongoose.model<IBloodDonor>("BloodDonor", BloodDonorSchema);
