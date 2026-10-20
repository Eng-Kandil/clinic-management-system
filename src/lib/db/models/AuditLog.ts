import mongoose, { Schema, Document, Model } from "mongoose";
import CryptoJS from "crypto-js";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: mongoose.Types.ObjectId;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  previousHash?: string;
  currentHash: string;
  severity: "info" | "warning" | "critical";
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: [true, "Action is required"], trim: true },
    resource: { type: String, required: [true, "Resource is required"], trim: true },
    resourceId: { type: Schema.Types.ObjectId },
    details: { type: String, required: [true, "Details are required"] },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    previousHash: { type: String },
    currentHash: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 } // 365 days TTL
);

// Pre-save: generate hash for tamper detection
AuditLogSchema.pre("save", async function () {
  if (this.isNew) {
    const data = `${this.userId}|${this.action}|${this.resource}|${this.details}|${this.ipAddress}|${Date.now()}`;
    this.currentHash = CryptoJS.SHA256(data).toString();

    // Chain to previous log entry
    if (!this.previousHash) {
      const AuditLogModel = this.constructor as Model<IAuditLog>;
      const lastLog = await AuditLogModel.findOne(
        {},
        { currentHash: 1 },
        { sort: { createdAt: -1 } }
      );
      this.previousHash = lastLog?.currentHash ?? "GENESIS";
    }
  }
});

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
