import mongoose, { Schema, Document, Model } from "mongoose";

// ── Sub-document interfaces ──────────────────────────────────────────────────

export interface ICondition {
  name: string;
  probability: number;
  description: string;
}

export interface IDiagnosisResult {
  conditions: ICondition[];
  recommendations: string[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  disclaimer: string;
}

// ── Main document interface ──────────────────────────────────────────────────

export interface IAIDiagnosis extends Document {
  _id: mongoose.Types.ObjectId;
  /**
   * TODO(phase-6): Currently stores `User._id` (see src/app/api/ai-diagnosis/route.ts L42-45),
   * but the `ref: "User"` semantics conflict with the broader Patient/Doctor model split
   * used elsewhere in the app. Migrate this field to reference `Patient._id` (and update
   * route handlers + ownership checks accordingly) so AI diagnosis records are tied to
   * clinical patient profiles rather than raw user accounts.
   */
  patientId: mongoose.Types.ObjectId;
  symptoms: string[];
  additionalInfo?: string;
  patientAge?: number;
  patientGender?: string;
  result: IDiagnosisResult;
  status: "pending" | "completed" | "reviewed" | "dismissed";
  reviewedBy?: mongoose.Types.ObjectId;
  doctorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const ConditionSchema = new Schema<ICondition>(
  {
    name: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 1 },
    description: { type: String, required: true },
  },
  { _id: false }
);

const DiagnosisResultSchema = new Schema<IDiagnosisResult>(
  {
    conditions: { type: [ConditionSchema], required: true },
    recommendations: [{ type: String }],
    urgencyLevel: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      required: true,
    },
    disclaimer: { type: String, required: true },
  },
  { _id: false }
);

const AIDiagnosisSchema = new Schema<IAIDiagnosis>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient ID is required"],
      index: true,
    },
    symptoms: {
      type: [String],
      required: [true, "At least one symptom is required"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one symptom is required",
      },
    },
    additionalInfo: { type: String, trim: true },
    patientAge: { type: Number, min: 0, max: 150 },
    patientGender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    result: { type: DiagnosisResultSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "reviewed", "dismissed"],
      default: "completed",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    doctorNotes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

AIDiagnosisSchema.index({ patientId: 1, createdAt: -1 });
AIDiagnosisSchema.index({ status: 1 });
AIDiagnosisSchema.index({ "result.urgencyLevel": 1 });
AIDiagnosisSchema.index({ createdAt: -1 });

// ── Model ────────────────────────────────────────────────────────────────────

export const AIDiagnosisModel: Model<IAIDiagnosis> =
  mongoose.models.AIDiagnosis ||
  mongoose.model<IAIDiagnosis>("AIDiagnosis", AIDiagnosisSchema);
