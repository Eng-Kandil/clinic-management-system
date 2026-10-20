import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAvailableSlot {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  specialization: string;
  department: string;
  licenseNumber: string;
  bio?: string;
  experience: number;
  consultationFee: number;
  availableSlots: IAvailableSlot[];
  isAvailableForRemote: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AvailableSlotSchema = new Schema<IAvailableSlot>(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const DoctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
    },
    bio: { type: String, maxlength: 1000 },
    experience: {
      type: Number,
      required: true,
      min: [0, "Experience cannot be negative"],
      default: 0,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: [0, "Consultation fee cannot be negative"],
      default: 0,
    },
    availableSlots: [AvailableSlotSchema],
    isAvailableForRemote: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
DoctorSchema.index({ userId: 1 }, { unique: true });
DoctorSchema.index({ specialization: 1 });
DoctorSchema.index({ department: 1 });

// Virtual: populate user
DoctorSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const Doctor: Model<IDoctor> =
  mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", DoctorSchema);
