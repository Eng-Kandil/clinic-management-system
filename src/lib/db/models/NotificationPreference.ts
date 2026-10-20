import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inapp: boolean;
  };
  types: {
    appointment: boolean;
    prescription: boolean;
    billing: boolean;
    marketing: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      inapp: { type: Boolean, default: true },
    },
    types: {
      appointment: { type: Boolean, default: true },
      prescription: { type: Boolean, default: true },
      billing: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const NotificationPreference: Model<INotificationPreference> =
  mongoose.models.NotificationPreference ||
  mongoose.model<INotificationPreference>("NotificationPreference", NotificationPreferenceSchema);
