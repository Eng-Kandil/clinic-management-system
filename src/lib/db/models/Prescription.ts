import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  startDate: Date;
  endDate: Date;
}

export interface IPrescription extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicalRecordId: mongoose.Types.ObjectId;
  medications: IMedication[];
  status: "active" | "completed" | "cancelled" | "pending" | "pending_refill";
  notes?: string;
  refillOf?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    medicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
      required: false,
    },
    medications: {
      type: [MedicationSchema],
      validate: {
        validator: (v: IMedication[]) => v.length > 0,
        message: "At least one medication is required",
      },
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "pending", "pending_refill"],
      default: "active",
    },
    notes: { type: String },
    refillOf: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ doctorId: 1 });
PrescriptionSchema.index({ medicalRecordId: 1 });
PrescriptionSchema.index({ status: 1 });

export const Prescription: Model<IPrescription> =
  mongoose.models.Prescription ||
  mongoose.model<IPrescription>("Prescription", PrescriptionSchema);
