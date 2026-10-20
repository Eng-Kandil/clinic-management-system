import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRating extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  consultationId: mongoose.Types.ObjectId;
  score: number;
  comment?: string;
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    consultationId: { type: Schema.Types.ObjectId, ref: "Consultation", required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

// One rating per patient per consultation
RatingSchema.index({ patientId: 1, consultationId: 1 }, { unique: true });

export const Rating: Model<IRating> =
  mongoose.models.Rating ||
  mongoose.model<IRating>("Rating", RatingSchema);
