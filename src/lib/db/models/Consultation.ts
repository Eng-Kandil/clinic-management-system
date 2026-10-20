import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConsultationMessage {
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  timestamp: Date;
}

export interface IVoiceCallData {
  duration: number;
  initiatedBy: mongoose.Types.ObjectId;
  quality?: "good" | "fair" | "poor";
}

export interface IConsultation extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  type: "chat" | "voice" | "video";
  status: "waiting" | "active" | "ended";
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  messages: IConsultationMessage[];
  voiceCallData?: IVoiceCallData;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationMessageSchema = new Schema<IConsultationMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    fileUrl: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VoiceCallDataSchema = new Schema<IVoiceCallData>(
  {
    duration: { type: Number, required: true },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quality: {
      type: String,
      enum: ["good", "fair", "poor"],
    },
  },
  { _id: false }
);

const ConsultationSchema = new Schema<IConsultation>(
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
    type: {
      type: String,
      enum: ["chat", "voice", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, min: 0 },
    messages: [ConsultationMessageSchema],
    voiceCallData: VoiceCallDataSchema,
    summary: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
ConsultationSchema.index({ patientId: 1, createdAt: -1 });
ConsultationSchema.index({ doctorId: 1, createdAt: -1 });
ConsultationSchema.index({ appointmentId: 1 });
ConsultationSchema.index({ status: 1 });

export const Consultation: Model<IConsultation> =
  mongoose.models.Consultation ||
  mongoose.model<IConsultation>("Consultation", ConsultationSchema);
