import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFileUpload extends Document {
  ownerId: mongoose.Types.ObjectId;
  kind: "avatar" | "emr_attachment" | "chat_attachment";
  s3Key: string;
  mime: string;
  size: number;
  sha256?: string;
  createdAt: Date;
}

const FileUploadSchema = new Schema<IFileUpload>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: ["avatar", "emr_attachment", "chat_attachment"],
      required: true,
    },
    s3Key: { type: String, required: true, unique: true },
    mime: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0 },
    sha256: { type: String },
  },
  { timestamps: true }
);

export const FileUpload: Model<IFileUpload> =
  mongoose.models.FileUpload || mongoose.model<IFileUpload>("FileUpload", FileUploadSchema);
