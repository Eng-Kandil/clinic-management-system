import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITreatmentTracking extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  prescriptionId: mongoose.Types.ObjectId;
  medicationName: string;
  dosage: string;
  scheduledTime: Date;
  takenAt?: Date;
  status: "pending" | "taken" | "missed" | "skipped";
  notes?: string;
  sideEffects?: Array<{ symptom: string; severity: string; occurredAt?: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const TreatmentTrackingSchema = new Schema<ITreatmentTracking>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
      required: true,
    },
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    takenAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "taken", "missed", "skipped"],
      default: "pending",
    },
    notes: { type: String },
    sideEffects: [
      {
        symptom: { type: String, required: true },
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe"],
          required: true,
        },
        occurredAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
TreatmentTrackingSchema.index({ patientId: 1, scheduledTime: 1 });
TreatmentTrackingSchema.index({ prescriptionId: 1 });
TreatmentTrackingSchema.index({ status: 1 });
TreatmentTrackingSchema.index({ scheduledTime: 1 });

export const TreatmentTracking: Model<ITreatmentTracking> =
  mongoose.models.TreatmentTracking ||
  mongoose.model<ITreatmentTracking>(
    "TreatmentTracking",
    TreatmentTrackingSchema
  );
