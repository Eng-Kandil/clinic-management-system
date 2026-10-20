import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILabResult {
  testName: string;
  result: string;
  unit?: string;
  normalRange?: string;
  date: Date;
  isAbnormal?: boolean;
}

export interface IVitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

export interface IAttachment {
  filename: string;
  url: string;
  type: string;
  uploadedAt: Date;
  // FileUpload-reference fields (for structured attachment tracking)
  fileUploadId?: mongoose.Types.ObjectId;
  name?: string;
  mime?: string;
}

export interface ILabResultRef {
  test: string;
  value: string;
  unit?: string;
  normalRange?: string;
  date?: string;
}

export interface IAIDiagnosisSuggestion {
  conditions: Array<{
    name: string;
    probability: number;
    description: string;
  }>;
  suggestedDepartment: string;
  confidence: number;
  rawResponse: string;
}

export interface IMedicalRecord extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  visitDate: Date;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis: string;
  aiDiagnosisSuggestion?: IAIDiagnosisSuggestion;
  vitals?: IVitals;
  labResults?: ILabResult[];
  labResultRefs?: ILabResultRef[];
  prescriptions: mongoose.Types.ObjectId[];
  treatmentPlan?: string;
  followUpDate?: Date;
  attachments?: IAttachment[];
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabResultSchema = new Schema<ILabResult>(
  {
    testName: { type: String, required: true },
    result: { type: String, required: true },
    unit: { type: String },
    normalRange: { type: String },
    date: { type: Date, required: true },
    isAbnormal: { type: Boolean, default: false },
  },
  { _id: false }
);

const VitalsSchema = new Schema<IVitals>(
  {
    bloodPressure: { type: String },
    heartRate: { type: Number },
    temperature: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    oxygenSaturation: { type: Number },
    respiratoryRate: { type: Number },
  },
  { _id: false }
);

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    // FileUpload-reference fields
    fileUploadId: { type: Schema.Types.ObjectId, ref: "FileUpload" },
    name: { type: String },
    mime: { type: String },
  },
  { _id: false }
);

const LabResultRefSchema = new Schema<ILabResultRef>(
  {
    test: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    normalRange: { type: String },
    date: { type: String },
  },
  { _id: false }
);

const AIDiagnosisSuggestionSchema = new Schema<IAIDiagnosisSuggestion>(
  {
    conditions: [
      {
        name: { type: String, required: true },
        probability: { type: Number, required: true, min: 0, max: 1 },
        description: { type: String, required: true },
      },
    ],
    suggestedDepartment: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    rawResponse: { type: String, required: true },
  },
  { _id: false }
);

const MedicalRecordSchema = new Schema<IMedicalRecord>(
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
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    visitDate: { type: Date, required: true },
    chiefComplaint: { type: String, required: [true, "Chief complaint is required"] },
    symptoms: [{ type: String, trim: true }],
    diagnosis: { type: String, required: [true, "Diagnosis is required"] },
    aiDiagnosisSuggestion: AIDiagnosisSuggestionSchema,
    vitals: VitalsSchema,
    labResults: [LabResultSchema],
    labResultRefs: [LabResultRefSchema],
    prescriptions: [{ type: Schema.Types.ObjectId, ref: "Prescription" }],
    treatmentPlan: { type: String },
    followUpDate: { type: Date },
    attachments: [AttachmentSchema],
    isEncrypted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
MedicalRecordSchema.index({ patientId: 1, visitDate: -1 });
MedicalRecordSchema.index({ doctorId: 1, visitDate: -1 });
MedicalRecordSchema.index({ appointmentId: 1 });

export const MedicalRecord: Model<IMedicalRecord> =
  mongoose.models.MedicalRecord ||
  mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);
