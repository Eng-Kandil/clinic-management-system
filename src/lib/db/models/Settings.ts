import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISettings extends Document {
  key: string;
  aiEnabled: boolean;
  registrationOpen: boolean;
  maintenanceMode: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    aiEnabled: { type: Boolean, default: true },
    registrationOpen: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
