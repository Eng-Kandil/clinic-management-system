import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRespondedDonor {
  donorId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "donated";
  respondedAt: Date;
}

export interface IBloodRequestLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface IBloodRequest extends Document {
  _id: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  bloodType: string;
  unitsNeeded: number;
  urgency: "routine" | "urgent" | "emergency";
  status: "open" | "partially_fulfilled" | "fulfilled" | "cancelled" | "expired";
  hospital: string;
  location: IBloodRequestLocation;
  respondedDonors: IRespondedDonor[];
  unitsFulfilled: number;
  deadline?: Date;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RespondedDonorSchema = new Schema<IRespondedDonor>(
  {
    donorId: {
      type: Schema.Types.ObjectId,
      ref: "BloodDonor",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "donated"],
      default: "pending",
    },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BloodRequestLocationSchema = new Schema<IBloodRequestLocation>(
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

const BloodRequestSchema = new Schema<IBloodRequest>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },
    bloodType: {
      type: String,
      required: [true, "Blood type is required"],
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: [1, "At least 1 unit is required"],
    },
    urgency: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    status: {
      type: String,
      enum: ["open", "partially_fulfilled", "fulfilled", "cancelled", "expired"],
      default: "open",
    },
    hospital: { type: String, required: [true, "Hospital name is required"], trim: true },
    location: {
      type: BloodRequestLocationSchema,
      required: true,
    },
    respondedDonors: [RespondedDonorSchema],
    unitsFulfilled: { type: Number, default: 0, min: 0 },
    deadline: { type: Date },
    expiresAt: { type: Date, required: false },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
BloodRequestSchema.index({ requestedBy: 1 });
BloodRequestSchema.index({ bloodType: 1, status: 1 });
BloodRequestSchema.index({ urgency: 1, status: 1 });
BloodRequestSchema.index({ location: "2dsphere" });
BloodRequestSchema.index({ createdAt: -1 });

export const BloodRequest: Model<IBloodRequest> =
  mongoose.models.BloodRequest ||
  mongoose.model<IBloodRequest>("BloodRequest", BloodRequestSchema);
