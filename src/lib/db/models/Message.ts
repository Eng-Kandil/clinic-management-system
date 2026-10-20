import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMessage extends Document {
  consultationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  role: "patient" | "doctor" | "system";
  body: string;
  attachments?: string[];
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    consultationId: { type: Schema.Types.ObjectId, ref: "Consultation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["patient", "doctor", "system"], required: true },
    body: { type: String, required: true, maxlength: 10000 },
    attachments: [{ type: String }],
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ consultationId: 1, createdAt: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);
