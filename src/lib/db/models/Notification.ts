import mongoose, { Document, Schema, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: "appointment" | "prescription" | "billing" | "system" | "chat";
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["appointment", "prescription", "billing", "system", "chat"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    link: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
