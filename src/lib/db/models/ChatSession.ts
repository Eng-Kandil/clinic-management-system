import mongoose, { Document, Model, Schema } from "mongoose";

interface IChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  archivedAt?: Date;
  lastMessageAt?: Date;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    tokensIn: { type: Number },
    tokensOut: { type: Number },
    model: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, maxlength: 200 },
    archivedAt: { type: Date },
    lastMessageAt: { type: Date },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

// Cap messages array at 50 entries using $slice in updates
ChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });

export const ChatSession: Model<IChatSession> =
  mongoose.models.ChatSession || mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
